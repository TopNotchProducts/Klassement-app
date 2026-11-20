import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/auth";
import { ActieVelden, Kaart, Knop, Leeg, Melding, PaginaKop } from "@/components/ui";
import { deelKlassenIn } from "../../acties";

/** Teams indelen in de klassen van de competitie: één keuzelijst per team. */
export default async function Indelen({ params, searchParams }: PageProps<"/[org]/beheer/seizoenen/[seizoen]/indelen">) {
  const { org, seizoen: seizoenId } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: seizoen } = await supabase
    .from("seizoen")
    .select("id, naam, onderdeel (id, naam, vorm, fase (id, volgorde, type, poule (id, naam, volgorde, inschrijving (team_id))))")
    .eq("id", seizoenId)
    .eq("organisatie_id", organisatie.id)
    .maybeSingle();
  if (!seizoen) notFound();
  const { data: teams } = await supabase.from("team").select("id, naam").eq("organisatie_id", organisatie.id).order("naam");

  const fase = seizoen.onderdeel
    .filter((o) => o.vorm === "competitie")
    .flatMap((o) => o.fase)
    .filter((f) => f.type === "poule")
    .sort((a, b) => a.volgorde - b.volgorde)[0];
  const poules = [...(fase?.poule ?? [])].sort((a, b) => a.volgorde - b.volgorde);
  const indeling = new Map(poules.flatMap((p) => p.inschrijving.map((i) => [i.team_id, p.id] as const)));
  const terug = `/${org}/beheer/seizoenen/${seizoenId}/indelen`;

  return (
    <>
      <Link href={`/${org}/beheer/seizoenen/${seizoenId}`} className="mb-3 inline-block text-sm text-zinc-600 underline">
        ← {seizoen.naam}
      </Link>
      <PaginaKop titel={`Teams indelen · ${seizoen.naam}`} uitleg="Kies per team in welke klasse het speelt. Teams die niet meedoen laat je op “doet niet mee”." />
      <Melding zoek={zoek} />
      {!fase || poules.length === 0 ? (
        <Leeg>Dit seizoen heeft nog geen klassen. Voeg ze toe bij het seizoen.</Leeg>
      ) : (teams ?? []).length === 0 ? (
        <Leeg>
          Er zijn nog geen teams. <Link className="underline" href={`/${org}/beheer/teams`}>Voeg eerst teams toe</Link>.
        </Leeg>
      ) : (
        <form action={deelKlassenIn} className="flex flex-col gap-4">
          <ActieVelden org={org} terug={terug} fase_id={fase.id} />
          <Kaart>
            <p className="mb-3 text-sm text-zinc-600">
              {poules.map((p) => `${p.naam}: ${[...indeling.values()].filter((v) => v === p.id).length}`).join(" · ")}
            </p>
            <ul className="flex flex-col divide-y divide-zinc-100">
              {(teams ?? []).map((t) => (
                <li key={t.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <label htmlFor={`team-${t.id}`} className="font-medium">
                    {t.naam}
                  </label>
                  <select
                    id={`team-${t.id}`}
                    name={`team:${t.id}`}
                    defaultValue={indeling.get(t.id) ?? ""}
                    className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 sm:w-64"
                  >
                    <option value="">Doet niet mee</option>
                    {poules.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.naam}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </Kaart>
          <Knop className="sm:self-start">Indeling opslaan</Knop>
        </form>
      )}
    </>
  );
}
