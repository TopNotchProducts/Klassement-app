// Knockout-boom: seeding, byes en de doorstroom-koppelingen. Puur, zonder database.

/**
 * Seedvolgorde voor een boom van `grootte` (macht van 2), als paren van boven naar beneden.
 * Voor 16: 1–16, 8–9, 4–13, 5–12, 2–15, 7–10, 3–14, 6–11. Dat is dezelfde boom als in
 * CLAUDE.md (1 treft 8/9, dan 4/5/12/13; 1 en 2 pas in de finale); alleen de volgorde
 * binnen een kwart staat anders getekend.
 */
export function seedVolgorde(grootte: number): number[] {
  if (grootte < 2 || (grootte & (grootte - 1)) !== 0) throw new Error("grootte moet een macht van 2 zijn");
  let volgorde = [1, 2];
  while (volgorde.length < grootte) {
    const n = volgorde.length * 2;
    volgorde = volgorde.flatMap((s) => [s, n + 1 - s]);
  }
  return volgorde;
}

export const volgendeMachtVan2 = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

export interface KnockoutWedstrijd {
  /** Unieke sleutel binnen de boom, bijv. "1-3" (ronde 1, slot 3). */
  sleutel: string;
  ronde: number; // 1 = eerste ronde
  slot: number; // 1-based, van boven naar beneden
  thuis: string | null; // team-id; null = nog onbekend (winnaar van een eerdere wedstrijd)
  uit: string | null;
  winnaarNaar: { sleutel: string; slot: "thuis" | "uit" } | null;
  /** Leesbare oorsprong voor lege plekken, bijv. thuis: "Winnaar 1-1". */
  herkomst: { thuis?: string; uit?: string };
}

export function rondeNaam(ronde: number, aantalRondes: number): string {
  const vanAchter = aantalRondes - ronde;
  if (vanAchter === 0) return "Finale";
  if (vanAchter === 1) return "Halve finale";
  if (vanAchter === 2) return "Kwartfinale";
  if (vanAchter === 3) return "Achtste finale";
  return `Ronde ${ronde}`;
}

/**
 * Bouwt de boom voor teams in seedvolgorde (index 0 = seed 1). Bij een aantal dat geen
 * macht van 2 is krijgen de hoogste seeds een bye: hun eerste-rondewedstrijd vervalt en ze
 * staan direct in ronde 2.
 */
export function bouwKnockout(teams: string[]): KnockoutWedstrijd[] {
  if (teams.length < 2) return [];
  const grootte = volgendeMachtVan2(teams.length);
  const aantalRondes = Math.log2(grootte);
  const seeds = seedVolgorde(grootte);
  const team = (seed: number) => (seed <= teams.length ? teams[seed - 1] : null); // null = bye

  // Volledige boom opbouwen, ronde voor ronde.
  const rondes: KnockoutWedstrijd[][] = [];
  for (let r = 1; r <= aantalRondes; r++) {
    const aantal = grootte / 2 ** r;
    const ronde: KnockoutWedstrijd[] = [];
    for (let s = 1; s <= aantal; s++) {
      ronde.push({
        sleutel: `${r}-${s}`,
        ronde: r,
        slot: s,
        thuis: r === 1 ? team(seeds[(s - 1) * 2]) : null,
        uit: r === 1 ? team(seeds[(s - 1) * 2 + 1]) : null,
        winnaarNaar: r < aantalRondes ? { sleutel: `${r + 1}-${Math.ceil(s / 2)}`, slot: s % 2 === 1 ? "thuis" : "uit" } : null,
        herkomst: {},
      });
    }
    rondes.push(ronde);
  }
  for (const ronde of rondes.slice(1)) {
    for (const w of ronde) {
      w.herkomst = { thuis: `Winnaar ${w.ronde - 1}-${w.slot * 2 - 1}`, uit: `Winnaar ${w.ronde - 1}-${w.slot * 2}` };
    }
  }

  // Byes: een eerste-rondewedstrijd met één team vervalt; het team schuift door.
  const vervallen = new Set<string>();
  for (const w of rondes[0]) {
    if (w.thuis && w.uit) continue;
    const door = w.thuis ?? w.uit;
    vervallen.add(w.sleutel);
    const doel = rondes[1]?.find((x) => x.sleutel === w.winnaarNaar?.sleutel);
    if (doel && w.winnaarNaar) {
      doel[w.winnaarNaar.slot] = door;
      delete doel.herkomst[w.winnaarNaar.slot];
    }
  }
  return rondes.flat().filter((w) => !vervallen.has(w.sleutel));
}
