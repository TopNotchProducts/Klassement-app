import { vereisBeheerder } from "@/lib/auth";
import { emailsVan } from "@/lib/gebruikers";
import { ActieVelden, Invoer, Kaart, Keuze, Knop, Melding, PaginaKop, VerwijderKnop } from "@/components/ui";
import { verwijderLid, voegLidToe } from "./acties";

const ROLLEN = {
  beheerder: "Beheerder (bestuur): kan alles",
  scheidsrechter: "Scheidsrechter: voert uitslagen in",
  aanvoerder: "Aanvoerder",
} as const;

export default async function Leden({ params, searchParams }: PageProps<"/[org]/beheer/leden">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: leden } = await supabase
    .from("organisatie_lid")
    .select("id, user_id, rol")
    .eq("organisatie_id", organisatie.id);
  const emails = await emailsVan((leden ?? []).map((l) => l.user_id));
  const gesorteerd = [...(leden ?? [])].sort(
    (a, b) => a.rol.localeCompare(b.rol) || (emails.get(a.user_id) ?? "").localeCompare(emails.get(b.user_id) ?? ""),
  );
  const av = { org, terug: `/${org}/beheer/leden` };

  return (
    <>
      <PaginaKop titel="Leden" uitleg="Wie mag inloggen en wat mag die persoon? Iemand toevoegen stuurt geen mail; laat diegene inloggen via de inlogpagina." />
      <Melding zoek={zoek} />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Kaart>
          <ul className="flex flex-col divide-y divide-zinc-100">
            {gesorteerd.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 break-all">{emails.get(l.user_id) ?? "onbekend"}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm">{l.rol}</span>
                  <VerwijderKnop actie={verwijderLid} vraag="Deze rol intrekken?">
                    <ActieVelden {...av} id={l.id} />
                  </VerwijderKnop>
                </span>
              </li>
            ))}
          </ul>
        </Kaart>
        <Kaart titel="Iemand toevoegen">
          <form action={voegLidToe} className="flex flex-col gap-3">
            <ActieVelden {...av} />
            <Invoer label="E-mailadres" name="email" type="email" required />
            <Keuze label="Rol" name="rol" defaultValue="scheidsrechter">
              {Object.entries(ROLLEN).map(([waarde, label]) => (
                <option key={waarde} value={waarde}>
                  {label}
                </option>
              ))}
            </Keuze>
            <Knop>Toevoegen</Knop>
          </form>
        </Kaart>
      </div>
    </>
  );
}
