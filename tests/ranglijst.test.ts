import { describe, expect, it } from "vitest";
import { berekenRanglijst, type RanglijstWedstrijd } from "@/lib/ranglijst";
import { leesRegelset, regelsetSchema } from "@/lib/regelset";

const T = (...namen: string[]) => namen.map((n) => ({ id: n, naam: n }));
const W = (thuis: string, scoreThuis: number, scoreUit: number, uit: string): RanglijstWedstrijd => ({ thuis, uit, scoreThuis, scoreUit });
const standaard = leesRegelset({});
const volgorde = (r: ReturnType<typeof berekenRanglijst>) => r.regels.map((x) => x.teamId);

describe("regelset", () => {
  it("vult standaardwaarden in", () => {
    expect(standaard).toMatchObject({
      punten: { winst: 3, gelijk: 1, verlies: 0 },
      rangschikking: "totaal",
      tiebreakers: ["doelsaldo", "onderling", "doelpunten_voor", "loting"],
      keer_tegen_elkaar: 1,
    });
  });
  it("weigert onbekende of dubbele tiebreakers", () => {
    expect(regelsetSchema.safeParse({ tiebreakers: ["doelsaldo", "doelsaldo"] }).success).toBe(false);
    expect(regelsetSchema.safeParse({ tiebreakers: ["muntje"] }).success).toBe(false);
  });
});

describe("berekenRanglijst", () => {
  it("telt punten, doelsaldo en gespeeld", () => {
    const r = berekenRanglijst({
      teams: T("A", "B", "C"),
      wedstrijden: [W("A", 2, 0, "B"), W("B", 1, 1, "C"), W("C", 0, 3, "A")],
      regelset: standaard,
    });
    // B (0-2 verloren, 1-1) saldo -2; C (1-1, 0-3 verloren) saldo -3
    expect(volgorde(r)).toEqual(["A", "B", "C"]);
    expect(r.regels[0]).toMatchObject({ punten: 6, gespeeld: 2, gewonnen: 2, voor: 5, tegen: 0, saldo: 5, positie: 1, beslistDoor: null });
    expect(r.regels[1]).toMatchObject({ teamId: "B", punten: 1, saldo: -2, positie: 2, beslistDoor: "doelsaldo" });
    expect(r.regels[2]).toMatchObject({ teamId: "C", punten: 1, saldo: -3, positie: 3 });
  });

  it("past puntcorrecties toe", () => {
    const r = berekenRanglijst({
      teams: T("A", "B"),
      wedstrijden: [W("A", 1, 0, "B")],
      regelset: standaard,
      correcties: new Map([["A", -5]]),
    });
    expect(volgorde(r)).toEqual(["B", "A"]);
    expect(r.regels[1]).toMatchObject({ punten: -2, correctie: -5 });
  });

  it("onderling: mini-stand van alleen de gelijke teams", () => {
    // A en B: evenveel punten en doelsaldo; B won het onderlinge duel.
    const r = berekenRanglijst({
      teams: T("A", "B", "C"),
      wedstrijden: [W("A", 0, 1, "B"), W("A", 3, 0, "C"), W("B", 1, 3, "C"), W("C", 0, 1, "A"), W("B", 2, 1, "C")],
      regelset: { ...standaard, tiebreakers: ["onderling", "doelsaldo"] },
    });
    expect(volgorde(r).slice(0, 2)).toEqual(["B", "A"]);
    expect(r.regels[0].beslistDoor).toBe("onderling");
  });

  it("onderling gelijk → de volgende tiebreaker", () => {
    const r = berekenRanglijst({
      teams: T("A", "B", "C"),
      wedstrijden: [W("A", 1, 1, "B"), W("A", 5, 0, "C"), W("B", 1, 0, "C")],
      regelset: { ...standaard, tiebreakers: ["onderling", "doelsaldo"] },
    });
    expect(volgorde(r)).toEqual(["A", "B", "C"]);
    expect(r.regels[0].beslistDoor).toBe("doelsaldo");
  });

  it("loting beslist als alles gelijk is, en zonder loting blijft het onbeslist", () => {
    const wedstrijden = [W("A", 1, 1, "B")];
    const zonder = berekenRanglijst({ teams: T("A", "B"), wedstrijden, regelset: standaard });
    expect(zonder.regels.every((x) => x.onbeslist && x.positie === 1)).toBe(true);
    expect(zonder.waarschuwingen.join()).toMatch(/loting/);

    const met = berekenRanglijst({ teams: T("A", "B"), wedstrijden, regelset: { ...standaard, loting: ["B", "A"] } });
    expect(volgorde(met)).toEqual(["B", "A"]);
    expect(met.regels.map((x) => x.positie)).toEqual([1, 2]);
    expect(met.regels[0].beslistDoor).toBe("loting");
    expect(met.waarschuwingen).toEqual([]);
  });

  it("geen lotingwaarschuwing aan het begin van het seizoen", () => {
    const r = berekenRanglijst({ teams: T("A", "B"), wedstrijden: [], regelset: standaard });
    expect(r.waarschuwingen).toEqual([]);
  });

  it("minste kaarten", () => {
    const r = berekenRanglijst({
      teams: T("A", "B"),
      wedstrijden: [W("A", 0, 0, "B")],
      regelset: { ...standaard, tiebreakers: ["minste_kaarten"] },
      kaarten: new Map([["A", 3], ["B", 1]]),
    });
    expect(volgorde(r)).toEqual(["B", "A"]);
  });

  it("waarschuwt bij totaal en ongelijk aantal wedstrijden", () => {
    const r = berekenRanglijst({ teams: T("A", "B", "C"), wedstrijden: [W("A", 1, 0, "B")], regelset: standaard });
    expect(r.waarschuwingen.join()).toMatch(/evenveel wedstrijden/);
  });

  it("WAC-controlegeval: gemiddelde, dan meeste gespeeld (Leenders 3 gespeeld boven Auto Mundi 2 gespeeld)", () => {
    const wac = leesRegelset({
      rangschikking: "gemiddelde",
      tiebreakers: ["meeste_gespeeld", "doelsaldo", "doelpunten_voor", "loting"],
    });
    // Leenders: 6 punten uit 3 (W, W, V), saldo +1. Auto Mundi: 4 punten uit 2 (W, G), saldo +5.
    // Beide 2,0 gemiddeld; meeste gespeeld beslist vóór het (betere) gemiddelde doelsaldo van Auto Mundi.
    const r = berekenRanglijst({
      teams: T("Leenders Tegelzetters", "Auto Mundi/@Harmse", "X", "Y", "Z"),
      wedstrijden: [
        W("Leenders Tegelzetters", 1, 0, "X"),
        W("Y", 0, 1, "Leenders Tegelzetters"),
        W("Leenders Tegelzetters", 0, 1, "Z"),
        W("Auto Mundi/@Harmse", 5, 0, "Z"),
        W("X", 1, 1, "Auto Mundi/@Harmse"),
      ],
      regelset: wac,
    });
    const leenders = r.regels.find((x) => x.teamId === "Leenders Tegelzetters")!;
    const auto = r.regels.find((x) => x.teamId === "Auto Mundi/@Harmse")!;
    expect(leenders.gespeeld).toBe(3);
    expect(auto.gespeeld).toBe(2);
    expect(leenders.gemiddelde).toBeCloseTo(auto.gemiddelde);
    expect(leenders.positie).toBeLessThan(auto.positie);
    expect(leenders.beslistDoor).toBe("meeste_gespeeld");
    // gemiddeld doelsaldo van Auto Mundi is hoger, maar meeste_gespeeld gaat voor
    expect(auto.saldo / auto.gespeeld).toBeGreaterThan(leenders.saldo / leenders.gespeeld);
  });

  it("gemiddelde: doelsaldo en doelpunten voor per wedstrijd", () => {
    const r = berekenRanglijst({
      teams: T("A", "B", "C", "D"),
      // A: 1 wedstrijd, +2. B: 2 wedstrijden, +3 (gem. 1,5). Beide 3 punten gemiddeld.
      wedstrijden: [W("A", 2, 0, "C"), W("B", 2, 0, "D"), W("B", 1, 0, "C")],
      regelset: leesRegelset({ rangschikking: "gemiddelde", tiebreakers: ["doelsaldo"] }),
    });
    expect(volgorde(r).slice(0, 2)).toEqual(["A", "B"]);
    expect(r.waarschuwingen).toEqual([]);
  });
});
