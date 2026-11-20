// Vertaalt databasefouten naar een begrijpelijke melding voor een vrijwilliger.
type DbFout = { code?: string; message?: string } | null | undefined;

export function foutmelding(fout: DbFout, context?: { bestaatAl?: string; inGebruik?: string }): string {
  if (!fout) return "Er ging iets mis.";
  switch (fout.code) {
    case "23505":
      return context?.bestaatAl ?? "Dit bestaat al.";
    case "23503":
      return context?.inGebruik ?? "Dit wordt nog ergens gebruikt en kan daarom niet worden verwijderd.";
    case "23514":
      return "Een van de ingevulde waarden is niet geldig.";
    case "42501":
      return "Je hebt hier geen rechten voor.";
  }
  // Meldingen uit onze eigen triggers zijn al in gewone taal.
  if (fout.code === "P0001" && fout.message) return fout.message.charAt(0).toUpperCase() + fout.message.slice(1) + ".";
  return "Er ging iets mis. Probeer het opnieuw.";
}
