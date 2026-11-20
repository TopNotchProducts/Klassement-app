// Round-robin-schema (cirkelmethode) en planning over speelmomenten. Puur, zonder database.

export interface Paring {
  ronde: number;
  thuis: string;
  uit: string;
}

/**
 * Iedereen tegen iedereen, `keer` keer. Bij een oneven aantal heeft per ronde één team vrij.
 * Thuis/uit wisselt per ronde; bij een tweede keer zijn thuis en uit omgedraaid.
 */
export function roundRobin(teams: string[], keer = 1): Paring[] {
  if (teams.length < 2) return [];
  const lijst: (string | null)[] = [...teams];
  if (lijst.length % 2 === 1) lijst.push(null); // vrij
  const n = lijst.length;
  const enkele: Paring[] = [];
  let rotatie = lijst.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const ronde = [lijst[0], ...rotatie];
    for (let i = 0; i < n / 2; i++) {
      const a = ronde[i];
      const b = ronde[n - 1 - i];
      if (a === null || b === null) continue;
      // Het vaste team (i = 0) wisselt per ronde van thuis naar uit; de rest wisselt op positie.
      const omdraaien = i === 0 ? r % 2 === 1 : i % 2 === 1;
      enkele.push({ ronde: r + 1, thuis: omdraaien ? b : a, uit: omdraaien ? a : b });
    }
    rotatie = [rotatie[rotatie.length - 1], ...rotatie.slice(0, -1)];
  }
  const rondes = n - 1;
  const alles: Paring[] = [];
  for (let k = 0; k < keer; k++) {
    for (const p of enkele) {
      alles.push(
        k % 2 === 0
          ? { ronde: p.ronde + k * rondes, thuis: p.thuis, uit: p.uit }
          : { ronde: p.ronde + k * rondes, thuis: p.uit, uit: p.thuis },
      );
    }
  }
  return alles;
}

export interface Speelmoment {
  weekdag: number | null; // ISO: 1 = maandag … 7 = zondag
  datum: string | null; // YYYY-MM-DD
  starttijden: string[]; // "19:00"
  velden: string[]; // veld-id's, in volgorde
}

export interface Slot {
  datum: string;
  starttijd: string;
  veldId: string;
}

export interface TePlannen {
  sleutel: string; // eigen referentie van de aanroeper
  ronde: number;
  thuis: string;
  uit: string;
}

export interface Planning {
  gepland: (TePlannen & Slot)[];
  nietGepland: TePlannen[];
}

/** ISO-weekdag van een YYYY-MM-DD-datum (kalenderdatum, dus geen tijdzoneprobleem). */
function weekdag(datum: string): number {
  const d = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function plusDagen(datum: string, n: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Alle beschikbare speelslots tussen van en tot (inclusief), gesorteerd op datum, tijd, veld. */
export function slots(speelmomenten: Speelmoment[], van: string, tot: string, bezet: Set<string> = new Set()): Slot[] {
  const resultaat: Slot[] = [];
  const voegToe = (datum: string, m: Speelmoment) => {
    for (const starttijd of m.starttijden) {
      for (const veldId of m.velden) {
        const slot = { datum, starttijd: starttijd.slice(0, 5), veldId };
        if (!bezet.has(slotSleutel(slot))) resultaat.push(slot);
      }
    }
  };
  for (const m of speelmomenten) {
    if (m.datum) {
      if (m.datum >= van && m.datum <= tot) voegToe(m.datum, m);
    } else if (m.weekdag) {
      let d = van;
      while (weekdag(d) !== m.weekdag) d = plusDagen(d, 1);
      for (; d <= tot; d = plusDagen(d, 7)) voegToe(d, m);
    }
  }
  const veldVolgorde = new Map(speelmomenten.flatMap((m) => m.velden).map((v, i) => [v, i]));
  return resultaat
    .filter((s, i, a) => a.findIndex((x) => slotSleutel(x) === slotSleutel(s)) === i)
    .sort(
      (a, b) =>
        a.datum.localeCompare(b.datum) ||
        a.starttijd.localeCompare(b.starttijd) ||
        (veldVolgorde.get(a.veldId) ?? 0) - (veldVolgorde.get(b.veldId) ?? 0),
    );
}

export const slotSleutel = (s: Slot) => `${s.datum}|${s.starttijd}|${s.veldId}`;

/**
 * Verdeelt wedstrijden over de slots. Regels: een team speelt hooguit één keer per
 * datum, en de wedstrijden van een team blijven in rondevolgorde. Rondes van
 * verschillende poules worden door elkaar op dezelfde avond gepland.
 * Wat niet past, komt in `nietGepland` (de beheerder voegt dan speelmomenten toe).
 */
export function plan(wedstrijden: TePlannen[], beschikbaar: Slot[]): Planning {
  const wachtrij = [...wedstrijden].sort((a, b) => a.ronde - b.ronde);
  const gepland: (TePlannen & Slot)[] = [];
  const perDatum = new Map<string, Slot[]>();
  for (const s of beschikbaar) perDatum.set(s.datum, [...(perDatum.get(s.datum) ?? []), s]);
  // Open rondes per team: een team speelt zijn wedstrijden in rondevolgorde.
  const openRondes = (team: string) => wachtrij.filter((w) => w.thuis === team || w.uit === team).map((w) => w.ronde);

  for (const [datum, vrij] of perDatum) {
    if (wachtrij.length === 0) break;
    const vandaag = new Set<string>();
    for (const slot of vrij) {
      const i = wachtrij.findIndex(
        (w) =>
          !vandaag.has(w.thuis) &&
          !vandaag.has(w.uit) &&
          Math.min(...openRondes(w.thuis)) === w.ronde &&
          Math.min(...openRondes(w.uit)) === w.ronde,
      );
      if (i < 0) break;
      const [w] = wachtrij.splice(i, 1);
      vandaag.add(w.thuis);
      vandaag.add(w.uit);
      gepland.push({ ...w, ...slot, datum });
    }
  }
  return { gepland, nietGepland: wachtrij };
}
