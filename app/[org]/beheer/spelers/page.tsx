import { vereisBeheerder } from "@/lib/auth";
import { ActieVelden, Invoer, Kaart, Keuze, Knop, KnopLink, Leeg, Melding, PaginaKop, VerwijderKnop, Vinkje } from "@/components/ui";
import { maakSpeler, verwijderSpeler, wijzigSpeler } from "./acties";
import { kiesSeizoen } from "./seizoen-keuze";

export default async function Spelers({ params, searchParams }: PageProps<"/[org]/beheer/spelers">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const [{ data: seizoenen }, { data: teams }, { data: spelers }] = await Promise.all([
    supabase.from("seizoen").select("id, naam, status, startdatum").eq("organisatie_id", organisatie.id),
    supabase.from("team").select("id, naam").eq("organisatie_id", organisatie.id).order("naam"),
    supabase.from("speler").select("id, naam, rugnummer, verborgen, foto_toestemming").eq("organisatie_id", organisatie.id).order("naam"),
  ]);
  const seizoen = kiesSeizoen(seizoenen ?? [], zoek.seizoen);
  const { data: selecties } = seizoen
    ? await supabase.from("selectie").select("speler_id, team_id").eq("seizoen_id", seizoen.id)
    : { data: [] };
  const teamVan = new Map((selecties ?? []).map((s) => [s.speler_id, s.team_id]));

  const terug = `/${org}/beheer/spelers${seizoen ? `?seizoen=${seizoen.id}` : ""}`;
  const av = { org, terug, seizoen_id: seizoen?.id ?? "" };
  const groepen = [
    ...(teams ?? []).map((t) => ({ id: t.id, naam: t.naam, spelers: (spelers ?? []).filter((s) => teamVan.get(s.id) === t.id) })),
    { id: "", naam: seizoen ? `Zonder team in ${seizoen.naam}` : "Spelers", spelers: (spelers ?? []).filter((s) => !teamVan.has(s.id)) },
  ].filter((g) => g.spelers.length > 0);

  const teamKeuze = (standaard?: string) =>
    seizoen ? (
      <Keuze label={`Team in ${seizoen.naam}`} name="team_id" defaultValue={standaard ?? ""}>
        <option value="">Geen team</option>
        {(teams ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {t.naam}
          </option>
        ))}
      </Keuze>
    ) : null;

  return (
    <>
      <PaginaKop
        titel="Spelers"
        uitleg="Een speler hoort per seizoen bij één team. Wissel je het team, dan is hij overgeschreven; zijn doelpunten blijven bij het oude team staan."
        actie={<KnopLink soort="secundair" href={`/${org}/beheer/spelers/import${seizoen ? `?seizoen=${seizoen.id}` : ""}`}>Importeren uit Excel/CSV</KnopLink>}
      />
      <Melding zoek={zoek} />
      {(seizoenen ?? []).length > 1 && (
        <form className="mb-4 flex items-end gap-2">
          <div className="flex-1 sm:max-w-xs">
            <Keuze label="Seizoen" name="seizoen" defaultValue={seizoen?.id}>
              {(seizoenen ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.naam}
                </option>
              ))}
            </Keuze>
          </div>
          <Knop soort="secundair">Tonen</Knop>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {groepen.length === 0 && <Leeg>Nog geen spelers.</Leeg>}
          {groepen.map((g) => (
            <Kaart key={g.id || "zonder"} titel={`${g.naam} (${g.spelers.length})`}>
              <ul className="flex flex-col divide-y divide-zinc-100">
                {g.spelers.map((s) => (
                  <li key={s.id}>
                    <details>
                      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3">
                        <span className="w-8 text-right tabular-nums text-zinc-500">{s.rugnummer ?? ""}</span>
                        <span className="flex-1 font-medium">{s.naam}</span>
                        {s.verborgen && <span className="rounded bg-zinc-100 px-2 text-xs text-zinc-600">verborgen</span>}
                      </summary>
                      <form action={wijzigSpeler} className="flex flex-col gap-2 pb-3">
                        <ActieVelden {...av} id={s.id} />
                        <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                          <Invoer label="Naam" name="naam" defaultValue={s.naam} required />
                          <Invoer label="Rugnummer" name="rugnummer" inputMode="numeric" defaultValue={s.rugnummer ?? ""} />
                        </div>
                        {teamKeuze(teamVan.get(s.id))}
                        <Vinkje label="Verbergen" name="verborgen" defaultChecked={s.verborgen} hulp="Niet zichtbaar op de publieke pagina's (bijvoorbeeld op verzoek)." />
                        <Vinkje label="Toestemming voor foto's" name="foto_toestemming" defaultChecked={s.foto_toestemming} />
                        <Knop soort="secundair">Opslaan</Knop>
                      </form>
                      <div className="pb-3">
                        <VerwijderKnop actie={verwijderSpeler} vraag={`${s.naam} verwijderen?`}>
                          <ActieVelden {...av} id={s.id} />
                        </VerwijderKnop>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </Kaart>
          ))}
        </div>
        <Kaart titel="Speler toevoegen">
          <form action={maakSpeler} className="flex flex-col gap-3">
            <ActieVelden {...av} />
            <Invoer label="Naam" name="naam" required />
            <Invoer label="Rugnummer" name="rugnummer" inputMode="numeric" />
            {teamKeuze()}
            <Vinkje label="Toestemming voor foto's" name="foto_toestemming" />
            <Knop>Toevoegen</Knop>
          </form>
        </Kaart>
      </div>
    </>
  );
}
