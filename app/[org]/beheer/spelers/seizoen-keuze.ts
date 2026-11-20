type S = { id: string; naam: string; status: string; startdatum: string | null };

/** Het gekozen seizoen (?seizoen=), anders het lopende, anders het nieuwste. */
export function kiesSeizoen<T extends S>(seizoenen: T[], gekozen: string | string[] | undefined): T | undefined {
  const opDatum = [...seizoenen].sort((a, b) => (b.startdatum ?? "9999").localeCompare(a.startdatum ?? "9999") || b.naam.localeCompare(a.naam));
  return (
    opDatum.find((s) => s.id === gekozen) ??
    opDatum.find((s) => s.status === "actief") ??
    opDatum.find((s) => s.status === "concept") ??
    opDatum[0]
  );
}
