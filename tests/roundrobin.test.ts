import { describe, expect, it } from "vitest";
import { plan, roundRobin, slots, type TePlannen } from "@/lib/roundrobin";

const paarSleutel = (a: string, b: string) => [a, b].sort().join("-");

describe("roundRobin", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 11])("%i teams: iedereen precies één keer tegen iedereen", (n) => {
    const teams = Array.from({ length: n }, (_, i) => `T${i + 1}`);
    const p = roundRobin(teams);
    expect(p).toHaveLength((n * (n - 1)) / 2);
    expect(new Set(p.map((x) => paarSleutel(x.thuis, x.uit))).size).toBe(p.length);
    // per ronde speelt een team hooguit één keer
    const rondes = n % 2 === 0 ? n - 1 : n;
    expect(Math.max(...p.map((x) => x.ronde))).toBe(rondes);
    for (let r = 1; r <= rondes; r++) {
      const inRonde = p.filter((x) => x.ronde === r).flatMap((x) => [x.thuis, x.uit]);
      expect(new Set(inRonde).size).toBe(inRonde.length);
    }
  });

  it("thuis/uit is evenwichtig verdeeld (verschil hooguit 1)", () => {
    const teams = Array.from({ length: 8 }, (_, i) => `T${i + 1}`);
    const p = roundRobin(teams);
    for (const t of teams) {
      const thuis = p.filter((x) => x.thuis === t).length;
      const uit = p.filter((x) => x.uit === t).length;
      expect(Math.abs(thuis - uit)).toBeLessThanOrEqual(1);
    }
  });

  it("heen en terug: tweede helft omgedraaid, rondes doorgenummerd", () => {
    const p = roundRobin(["A", "B", "C", "D"], 2);
    expect(p).toHaveLength(12);
    expect(Math.max(...p.map((x) => x.ronde))).toBe(6);
    for (const x of p.filter((y) => y.ronde <= 3)) {
      expect(p.some((y) => y.ronde > 3 && y.thuis === x.uit && y.uit === x.thuis)).toBe(true);
    }
  });
});

describe("planning", () => {
  const vrijdag = { weekdag: 5, datum: null, starttijden: ["19:00", "20:00"], velden: ["v1", "v2"] };

  it("maakt slots op elke vrijdag, gesorteerd, zonder bezette slots", () => {
    const s = slots([vrijdag], "2026-09-01", "2026-09-14", new Set(["2026-09-04|19:00|v1"]));
    expect(s.map((x) => `${x.datum} ${x.starttijd} ${x.veldId}`)).toEqual([
      "2026-09-04 19:00 v2",
      "2026-09-04 20:00 v1",
      "2026-09-04 20:00 v2",
      "2026-09-11 19:00 v1",
      "2026-09-11 19:00 v2",
      "2026-09-11 20:00 v1",
      "2026-09-11 20:00 v2",
    ]);
  });

  it("plant elk team hooguit één keer per avond en in rondevolgorde", () => {
    const teams = ["A", "B", "C", "D", "E", "F"];
    const w: TePlannen[] = roundRobin(teams).map((p, i) => ({ sleutel: String(i), ...p }));
    const s = slots([vrijdag], "2026-09-01", "2026-12-31");
    const { gepland, nietGepland } = plan(w, s);
    expect(nietGepland).toEqual([]);
    expect(gepland).toHaveLength(15);
    const perAvond = new Map<string, string[]>();
    for (const g of gepland) perAvond.set(g.datum, [...(perAvond.get(g.datum) ?? []), g.thuis, g.uit]);
    for (const spelers of perAvond.values()) expect(new Set(spelers).size).toBe(spelers.length);
    for (const t of teams) {
      const rondes = gepland.filter((g) => g.thuis === t || g.uit === t).sort((a, b) => a.datum.localeCompare(b.datum)).map((g) => g.ronde);
      expect(rondes).toEqual([...rondes].sort((a, b) => a - b));
    }
    // geen slot dubbel
    expect(new Set(gepland.map((g) => `${g.datum}${g.starttijd}${g.veldId}`)).size).toBe(15);
  });

  it("twee klassen delen dezelfde avonden", () => {
    const a = roundRobin(["A1", "A2", "A3", "A4"]).map((p, i) => ({ sleutel: `a${i}`, ...p }));
    const b = roundRobin(["B1", "B2", "B3", "B4"]).map((p, i) => ({ sleutel: `b${i}`, ...p }));
    const { gepland, nietGepland } = plan([...a, ...b], slots([vrijdag], "2026-09-01", "2026-12-31"));
    expect(nietGepland).toEqual([]);
    // 4 slots per avond, 4 wedstrijden per ronde (2 per klasse) → 3 avonden
    expect(new Set(gepland.map((g) => g.datum)).size).toBe(3);
  });

  it("meldt wat niet past", () => {
    const w = roundRobin(["A", "B", "C", "D"]).map((p, i) => ({ sleutel: String(i), ...p }));
    const { gepland, nietGepland } = plan(w, slots([vrijdag], "2026-09-01", "2026-09-05"));
    expect(gepland).toHaveLength(2);
    expect(nietGepland).toHaveLength(4);
  });
});
