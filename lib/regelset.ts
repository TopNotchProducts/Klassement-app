// Regelset per fase (fase.regelset, jsonb), gevalideerd met zod. Zie CLAUDE.md "Regelset per fase".
import { z } from "zod";

export const TIEBREAKERS = [
  "doelsaldo",
  "onderling",
  "doelpunten_voor",
  "meeste_gespeeld",
  "minste_kaarten",
  "loting",
] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export const STANDAARD_TIEBREAKERS: Tiebreaker[] = ["doelsaldo", "onderling", "doelpunten_voor", "loting"];

export const regelsetSchema = z.object({
  punten: z
    .object({
      winst: z.number().int().min(0).max(10),
      gelijk: z.number().int().min(0).max(10),
      verlies: z.number().int().min(-5).max(10),
    })
    .default({ winst: 3, gelijk: 1, verlies: 0 }),
  /** Poulefase: hoe vaak speelt elk team tegen elk ander team (1 = enkele, 2 = heen en terug). */
  keer_tegen_elkaar: z.number().int().min(1).max(4).default(1),
  rangschikking: z.enum(["totaal", "gemiddelde"]).default("totaal"),
  tiebreakers: z
    .array(z.enum(TIEBREAKERS))
    .default(STANDAARD_TIEBREAKERS)
    .refine((t) => new Set(t).size === t.length, "een tiebreaker staat er twee keer in"),
  /** Uitslag van de loting, vastgelegd door de beheerder: team-id's van hoog naar laag. */
  loting: z.array(z.uuid()).default([]),
  /** Minuten; informatief en voor de planning. */
  wedstrijdduur: z.number().int().min(1).max(180).optional(),
  wedstrijdduur_finale: z.number().int().min(1).max(180).optional(),
  /** Knockout: wat bij een gelijke stand. */
  bij_gelijk: z.enum(["strafschoppen"]).default("strafschoppen"),
});

export type Regelset = z.infer<typeof regelsetSchema>;

/** Leest een regelset uit de database; onbekende of ontbrekende velden krijgen de standaard. */
export function leesRegelset(json: unknown): Regelset {
  return regelsetSchema.parse(json ?? {});
}

/** Uitleg in gewone taal (voor de publieke stand en het beheer). */
export const TIEBREAKER_TEKST: Record<Tiebreaker, string> = {
  doelsaldo: "doelsaldo",
  onderling: "onderling resultaat",
  doelpunten_voor: "meeste doelpunten voor",
  meeste_gespeeld: "meeste wedstrijden gespeeld",
  minste_kaarten: "minste kaarten",
  loting: "loting",
};
