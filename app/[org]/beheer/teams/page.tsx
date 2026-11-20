import { vereisBeheerder } from "@/lib/auth";
import { ActieVelden, Invoer, Kaart, Knop, Leeg, Melding, PaginaKop, Tekstvak, VerwijderKnop, Vinkje } from "@/components/ui";
import { aantal } from "@/lib/tekst";
import { maakTeams, verwijderTeam, wijzigTeam } from "./acties";

export default async function Teams({ params, searchParams }: PageProps<"/[org]/beheer/teams">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: teams } = await supabase
    .from("team")
    .select("id, naam, foto_toestemming")
    .eq("organisatie_id", organisatie.id)
    .order("naam");
  const av = { org, terug: `/${org}/beheer/teams` };

  return (
    <>
      <PaginaKop
        titel="Teams"
        uitleg="Een team blijft over de seizoenen heen hetzelfde, ook als de naam verandert. In welke klasse een team speelt, stel je per seizoen in."
      />
      <Melding zoek={zoek} />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Kaart titel={aantal(teams?.length ?? 0, "team", "teams")}>
          {(teams ?? []).length === 0 && <Leeg>Nog geen teams.</Leeg>}
          <ul className="flex flex-col divide-y divide-zinc-100">
            {(teams ?? []).map((t) => (
              <li key={t.id}>
                <details>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2">
                    <span className="font-medium">{t.naam}</span>
                    <span className="text-sm text-zinc-500">wijzigen</span>
                  </summary>
                  <form action={wijzigTeam} className="flex flex-col gap-2 pb-3">
                    <ActieVelden {...av} id={t.id} />
                    <Invoer label="Naam" name="naam" defaultValue={t.naam} required />
                    <Vinkje
                      label="Toestemming voor de teamfoto"
                      name="foto_toestemming"
                      defaultChecked={t.foto_toestemming}
                      hulp="Zonder toestemming tonen we de teamfoto niet."
                    />
                    <Knop soort="secundair">Opslaan</Knop>
                  </form>
                  <div className="pb-3">
                    <VerwijderKnop actie={verwijderTeam} vraag={`${t.naam} verwijderen?`}>
                      <ActieVelden {...av} id={t.id} />
                    </VerwijderKnop>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Kaart>
        <Kaart titel="Teams toevoegen">
          <form action={maakTeams} className="flex flex-col gap-3">
            <ActieVelden {...av} />
            <Tekstvak label="Teamnamen" name="namen" required hulp="Eén team per regel. Je kunt ook een lijst plakken." />
            <Knop>Toevoegen</Knop>
          </form>
        </Kaart>
      </div>
    </>
  );
}
