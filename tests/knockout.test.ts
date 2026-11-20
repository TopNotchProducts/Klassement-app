import { describe, expect, it } from "vitest";
import { bouwKnockout, rondeNaam, seedVolgorde } from "@/lib/knockout";

const paren = (v: number[]) => v.reduce<string[]>((acc, s, i) => (i % 2 ? [...acc.slice(0, -1), `${acc.at(-1)}-${s}`] : [...acc, String(s)]), []);

describe("seedVolgorde", () => {
  it("16: dezelfde boom als CLAUDE.md", () => {
    const p = paren(seedVolgorde(16));
    expect(new Set(p)).toEqual(new Set(["1-16", "8-9", "5-12", "4-13", "2-15", "7-10", "6-11", "3-14"]));
    // structuur: 1/16 treft 8/9; de bovenste helft bevat 1, 4, 5, 8; de onderste 2, 3, 6, 7
    expect(p.slice(0, 2)).toEqual(["1-16", "8-9"]);
    expect(new Set(p.slice(0, 4).flatMap((x) => x.split("-").map(Number)).filter((s) => s <= 8))).toEqual(new Set([1, 4, 5, 8]));
  });
  it("weigert een grootte die geen macht van 2 is", () => {
    expect(() => seedVolgorde(6)).toThrow();
  });
});

describe("bouwKnockout", () => {
  const teams = (n: number) => Array.from({ length: n }, (_, i) => `S${i + 1}`);

  it("8 teams: 7 wedstrijden, gekoppeld tot de finale", () => {
    const b = bouwKnockout(teams(8));
    expect(b).toHaveLength(7);
    expect(b.filter((w) => w.ronde === 1).map((w) => `${w.thuis}-${w.uit}`)).toEqual(["S1-S8", "S4-S5", "S2-S7", "S3-S6"]);
    const finale = b.find((w) => w.ronde === 3)!;
    expect(finale.winnaarNaar).toBeNull();
    expect(b.find((w) => w.sleutel === "1-1")!.winnaarNaar).toEqual({ sleutel: "2-1", slot: "thuis" });
    expect(b.find((w) => w.sleutel === "1-2")!.winnaarNaar).toEqual({ sleutel: "2-1", slot: "uit" });
    expect(b.find((w) => w.sleutel === "2-1")!.herkomst).toEqual({ thuis: "Winnaar 1-1", uit: "Winnaar 1-2" });
  });

  it("6 teams: seeds 1 en 2 hebben een bye en staan direct in ronde 2", () => {
    const b = bouwKnockout(teams(6));
    const r1 = b.filter((w) => w.ronde === 1);
    expect(r1.map((w) => `${w.thuis}-${w.uit}`)).toEqual(["S4-S5", "S3-S6"]);
    const r2 = b.filter((w) => w.ronde === 2);
    expect(r2.map((w) => [w.thuis, w.uit])).toEqual([
      ["S1", null],
      ["S2", null],
    ]);
    expect(r2[0].herkomst).toEqual({ uit: "Winnaar 1-2" });
    // elke resterende eerste-rondewedstrijd verwijst naar een bestaande wedstrijd
    const sleutels = new Set(b.map((w) => w.sleutel));
    for (const w of b) if (w.winnaarNaar) expect(sleutels.has(w.winnaarNaar.sleutel)).toBe(true);
  });

  it("2 teams: alleen een finale", () => {
    expect(bouwKnockout(teams(2))).toEqual([
      expect.objectContaining({ ronde: 1, thuis: "S1", uit: "S2", winnaarNaar: null }),
    ]);
  });

  it("rondenamen", () => {
    expect([1, 2, 3, 4].map((r) => rondeNaam(r, 4))).toEqual(["Achtste finale", "Kwartfinale", "Halve finale", "Finale"]);
  });
});
