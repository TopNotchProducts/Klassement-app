import { vereisBeheerder } from "@/lib/auth";
import { ActieVelden, Invoer, Kaart, Knop, Leeg, Melding, PaginaKop, VerwijderKnop } from "@/components/ui";
import { maakLocatie, maakVeld, verwijderLocatie, verwijderVeld, wijzigLocatie, wijzigVeld } from "./acties";

export default async function Locaties({ params, searchParams }: PageProps<"/[org]/beheer/locaties">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: locaties } = await supabase
    .from("locatie")
    .select("id, naam, plaats, veld (id, naam, volgorde)")
    .eq("organisatie_id", organisatie.id)
    .order("naam");
  const terug = `/${org}/beheer/locaties`;
  const av = { org, terug };

  return (
    <>
      <PaginaKop titel="Locaties en velden" uitleg="Waar wordt er gespeeld? Een sporthal is een locatie; elke zaal of elk veld daarin is een veld." />
      <Melding zoek={zoek} />
      <div className="flex flex-col gap-4">
        {(locaties ?? []).length === 0 && <Leeg>Nog geen locaties. Voeg hieronder je eerste sporthal toe.</Leeg>}
        {(locaties ?? []).map((l) => {
          const velden = [...l.veld].sort((a, b) => a.volgorde - b.volgorde || a.naam.localeCompare(b.naam));
          return (
            <Kaart key={l.id} titel={`${l.naam}${l.plaats ? ` · ${l.plaats}` : ""}`}>
              <ul className="mb-4 flex flex-col gap-2">
                {velden.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-end gap-2">
                    <form action={wijzigVeld} className="flex flex-1 items-end gap-2">
                      <ActieVelden {...av} id={v.id} />
                      <div className="flex-1">
                        <Invoer label="Veld" name="naam" defaultValue={v.naam} required />
                      </div>
                      <Knop soort="secundair">Opslaan</Knop>
                    </form>
                    <VerwijderKnop actie={verwijderVeld} vraag={`${v.naam} verwijderen? Wedstrijden op dit veld houden hun datum, maar krijgen geen veld meer.`}>
                      <ActieVelden {...av} id={v.id} />
                    </VerwijderKnop>
                  </li>
                ))}
              </ul>
              <form action={maakVeld} className="mb-4 flex items-end gap-2">
                <ActieVelden {...av} locatie_id={l.id} volgorde={String(velden.length + 1)} />
                <div className="flex-1">
                  <Invoer label="Nieuw veld" name="naam" placeholder={`Veld ${velden.length + 1}`} required />
                </div>
                <Knop soort="secundair">Toevoegen</Knop>
              </form>
              <details>
                <summary className="min-h-11 cursor-pointer content-center text-sm text-zinc-600">Locatie wijzigen of verwijderen</summary>
                <form action={wijzigLocatie} className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <ActieVelden {...av} id={l.id} />
                  <Invoer label="Naam" name="naam" defaultValue={l.naam} required />
                  <Invoer label="Plaats" name="plaats" defaultValue={l.plaats ?? ""} />
                  <Knop soort="secundair">Opslaan</Knop>
                </form>
                <div className="mt-2">
                  <VerwijderKnop actie={verwijderLocatie} vraag={`${l.naam} en alle velden verwijderen?`}>
                    <ActieVelden {...av} id={l.id} />
                  </VerwijderKnop>
                </div>
              </details>
            </Kaart>
          );
        })}
        <Kaart titel="Nieuwe locatie">
          <form action={maakLocatie} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <ActieVelden {...av} />
            <Invoer label="Naam" name="naam" placeholder="Sporthal De Eendracht" required />
            <Invoer label="Plaats" name="plaats" placeholder="Gemert" />
            <Knop>Toevoegen</Knop>
          </form>
        </Kaart>
      </div>
    </>
  );
}
