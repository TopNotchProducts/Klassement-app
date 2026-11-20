// Ranglijst-berekening: puur, zonder database. Standen worden NOOIT opgeslagen
// (CLAUDE.md); ze worden steeds hieruit afgeleid. De aanroeper geeft alleen
// bevestigde wedstrijden mee.
import type { Regelset, Tiebreaker } from "./regelset";

export interface RanglijstTeam {
  id: string;
  naam: string;
}

export interface RanglijstWedstrijd {
  thuis: string;
  uit: string;
  scoreThuis: number;
  scoreUit: number;
}

export interface Regel {
  teamId: string;
  naam: string;
  positie: number;
  gespeeld: number;
  gewonnen: number;
  gelijk: number;
  verloren: number;
  voor: number;
  tegen: number;
  saldo: number;
  /** Inclusief puntcorrecties. */
  punten: number;
  correctie: number;
  /** Punten per wedstrijd (0 als nog niet gespeeld). */
  gemiddelde: number;
  kaartpunten: number;
  /** Welke tiebreaker dit team scheidde van een team met evenveel punten; null als dat niet nodig was. */
  beslistDoor: Tiebreaker | null;
  /** Nog steeds gelijk na alle tiebreakers (loting nog niet vastgelegd). */
  onbeslist: boolean;
}

export interface RanglijstInvoer {
  teams: RanglijstTeam[];
  wedstrijden: RanglijstWedstrijd[];
  regelset: Pick<Regelset, "punten" | "rangschikking" | "tiebreakers" | "loting">;
  /** Puntcorrecties per team (som; negatief = aftrek). */
  correcties?: Map<string, number>;
  /** Kaartpunten per team (zie KAARTPUNTEN). */
  kaarten?: Map<string, number>;
}

export interface Ranglijst {
  regels: Regel[];
  waarschuwingen: string[];
}

/** Gewicht per kaart voor de tiebreaker "minste kaarten". */
export const KAARTPUNTEN = { groen: 1, geel: 1, rood: 3 } as const;

type Stat = Omit<Regel, "positie" | "beslistDoor" | "onbeslist">;

function telStand(teams: RanglijstTeam[], wedstrijden: RanglijstWedstrijd[], punten: Regelset["punten"]) {
  const stand = new Map<string, Stat>();
  for (const t of teams) {
    stand.set(t.id, {
      teamId: t.id,
      naam: t.naam,
      gespeeld: 0,
      gewonnen: 0,
      gelijk: 0,
      verloren: 0,
      voor: 0,
      tegen: 0,
      saldo: 0,
      punten: 0,
      correctie: 0,
      gemiddelde: 0,
      kaartpunten: 0,
    });
  }
  for (const w of wedstrijden) {
    const thuis = stand.get(w.thuis);
    const uit = stand.get(w.uit);
    // Een wedstrijd tegen een team buiten deze ranglijst telt niet mee.
    if (!thuis || !uit) continue;
    for (const [s, voor, tegen] of [
      [thuis, w.scoreThuis, w.scoreUit],
      [uit, w.scoreUit, w.scoreThuis],
    ] as const) {
      s.gespeeld++;
      s.voor += voor;
      s.tegen += tegen;
      if (voor > tegen) {
        s.gewonnen++;
        s.punten += punten.winst;
      } else if (voor === tegen) {
        s.gelijk++;
        s.punten += punten.gelijk;
      } else {
        s.verloren++;
        s.punten += punten.verlies;
      }
    }
  }
  for (const s of stand.values()) s.saldo = s.voor - s.tegen;
  return stand;
}

const perWedstrijd = (waarde: number, gespeeld: number) => (gespeeld === 0 ? 0 : waarde / gespeeld);

/** Vergelijk met een kleine marge, zodat gemiddelden als 4/3 en 8/6 als gelijk tellen. */
const gelijkGetal = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function berekenRanglijst(invoer: RanglijstInvoer): Ranglijst {
  const { teams, wedstrijden, regelset } = invoer;
  const gemiddeld = regelset.rangschikking === "gemiddelde";
  const stand = telStand(teams, wedstrijden, regelset.punten);
  for (const s of stand.values()) {
    s.correctie = invoer.correcties?.get(s.teamId) ?? 0;
    s.punten += s.correctie;
    s.gemiddelde = perWedstrijd(s.punten, s.gespeeld);
    s.kaartpunten = invoer.kaarten?.get(s.teamId) ?? 0;
  }

  const waarschuwingen: string[] = [];
  const aantallen = new Set([...stand.values()].map((s) => s.gespeeld));
  if (!gemiddeld && aantallen.size > 1) {
    waarschuwingen.push(
      "Niet alle teams hebben evenveel wedstrijden gespeeld. Bij rangschikking op totaal aantal punten kan dat oneerlijk uitvallen; overweeg “gemiddelde per wedstrijd”.",
    );
  }

  const hoofd = (s: Stat) => (gemiddeld ? s.gemiddelde : s.punten);
  const lotingIndex = new Map(regelset.loting.map((id, i) => [id, i]));

  /** Sorteerwaarde per tiebreaker voor een groep gelijke teams; hoger = beter. undefined = niet toepasbaar. */
  function waarden(tb: Tiebreaker, groep: Stat[]): Map<string, number> | undefined {
    switch (tb) {
      case "doelsaldo":
        return new Map(groep.map((s) => [s.teamId, gemiddeld ? perWedstrijd(s.saldo, s.gespeeld) : s.saldo]));
      case "doelpunten_voor":
        return new Map(groep.map((s) => [s.teamId, gemiddeld ? perWedstrijd(s.voor, s.gespeeld) : s.voor]));
      case "meeste_gespeeld":
        return new Map(groep.map((s) => [s.teamId, s.gespeeld]));
      case "minste_kaarten":
        return new Map(groep.map((s) => [s.teamId, -s.kaartpunten]));
      case "loting": {
        if (!groep.some((s) => lotingIndex.has(s.teamId))) return undefined;
        return new Map(groep.map((s) => [s.teamId, -(lotingIndex.get(s.teamId) ?? Number.MAX_SAFE_INTEGER)]));
      }
      case "onderling":
        return undefined; // apart afgehandeld: een eigen mini-stand
    }
  }

  /** Onderling: mini-stand van alleen de wedstrijden tussen de gelijke teams (punten, saldo, voor). */
  function onderling(groep: Stat[]): Stat[][] {
    const ids = new Set(groep.map((s) => s.teamId));
    const mini = telStand(
      groep.map((s) => ({ id: s.teamId, naam: s.naam })),
      wedstrijden.filter((w) => ids.has(w.thuis) && ids.has(w.uit)),
      regelset.punten,
    );
    const sleutel = (s: Stat) => {
      const m = mini.get(s.teamId)!;
      return [m.punten, m.saldo, m.voor];
    };
    return groepeer(groep, (a, b) => {
      const ka = sleutel(a);
      const kb = sleutel(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
      return 0;
    });
  }

  /** Sorteer en verdeel in groepen die op deze vergelijking gelijk zijn. */
  function groepeer(lijst: Stat[], vergelijk: (a: Stat, b: Stat) => number): Stat[][] {
    const gesorteerd = [...lijst].sort(vergelijk);
    const groepen: Stat[][] = [];
    for (const s of gesorteerd) {
      const laatste = groepen.at(-1);
      if (laatste && vergelijk(laatste[0], s) === 0) laatste.push(s);
      else groepen.push([s]);
    }
    return groepen;
  }

  const beslist = new Map<string, Tiebreaker | null>();
  /** Teams die na alle tiebreakers nog gelijk staan, met een groepsnummer per gelijke groep. */
  const onbeslist = new Map<string, number>();

  /** Breekt een groep gelijke teams met tiebreaker i en verder; geeft de definitieve volgorde. */
  function breek(groep: Stat[], i: number): Stat[] {
    if (groep.length === 1) return groep;
    const tb = regelset.tiebreakers[i];
    if (tb === undefined) {
      // Alle tiebreakers op: stabiel op naam, gemarkeerd als onbeslist.
      const nr = onbeslist.size;
      for (const s of groep) onbeslist.set(s.teamId, nr);
      return [...groep].sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
    }
    let delen: Stat[][];
    if (tb === "onderling") {
      delen = onderling(groep);
    } else {
      const w = waarden(tb, groep);
      if (!w) return breek(groep, i + 1);
      delen = groepeer(groep, (a, b) => (gelijkGetal(w.get(a.teamId)!, w.get(b.teamId)!) ? 0 : w.get(b.teamId)! - w.get(a.teamId)!));
    }
    if (delen.length > 1) {
      for (const deel of delen) for (const s of deel) if (!beslist.has(s.teamId)) beslist.set(s.teamId, tb);
    }
    return delen.flatMap((deel) => breek(deel, i + 1));
  }

  const hoofdgroepen = groepeer([...stand.values()], (a, b) => (gelijkGetal(hoofd(a), hoofd(b)) ? 0 : hoofd(b) - hoofd(a)));
  const volgorde = hoofdgroepen.flatMap((g) => breek(g, 0));

  const regels: Regel[] = volgorde.map((s, i) => ({
    ...s,
    positie: i + 1,
    beslistDoor: beslist.get(s.teamId) ?? null,
    onbeslist: onbeslist.has(s.teamId),
  }));
  // Teams die echt gelijk eindigen delen de positie (de hoogste van hun groep).
  for (let i = 1; i < regels.length; i++) {
    const groep = onbeslist.get(regels[i].teamId);
    if (groep !== undefined && onbeslist.get(regels[i - 1].teamId) === groep) regels[i].positie = regels[i - 1].positie;
  }
  // Aan het begin van het seizoen staat iedereen gelijk; dan is een loting nog niet aan de orde.
  if (onbeslist.size > 0 && regels.some((r) => r.gespeeld > 0)) {
    waarschuwingen.push("Sommige teams staan na alle tiebreakers nog gelijk. Leg een loting vast om de volgorde te bepalen.");
  }
  return { regels, waarschuwingen };
}
