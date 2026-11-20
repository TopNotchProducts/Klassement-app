import Link from "next/link";
import { vereisBeheerder } from "@/lib/auth";
import { volgendeSeizoensnaam } from "@/lib/seizoen";
import { ActieVelden, Invoer, Kaart, Keuze, Knop, Melding, PaginaKop, Tekstvak } from "@/components/ui";
import { maakSeizoen } from "../acties";

/** Seizoenswizard: kopieer teams en spelers → klassen → onderdelen; daarna indelen. */
export default async function NieuwSeizoen({ params, searchParams }: PageProps<"/[org]/beheer/seizoenen/nieuw">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: seizoenen } = await supabase
    .from("seizoen")
    .select("id, naam, onderdeel (naam, vorm, volgorde, fase (volgorde, poule (naam, volgorde)))")
    .eq("organisatie_id", organisatie.id)
    .order("startdatum", { ascending: false, nullsFirst: false })
    .order("naam", { ascending: false });

  const vorige = seizoenen?.[0];
  const competitie = vorige?.onderdeel.find((o) => o.vorm === "competitie");
  const vorigeKlassen = competitie?.fase
    .flatMap((f) => f.poule)
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((p) => p.naam);
  const vorigeToernooien = vorige?.onderdeel
    .filter((o) => o.vorm === "toernooi")
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((o) => o.naam);

  return (
    <>
      <Link href={`/${org}/beheer/seizoenen`} className="mb-3 inline-block text-sm text-zinc-600 underline">
        ← Seizoenen
      </Link>
      <PaginaKop titel="Nieuw seizoen" uitleg="In drie stappen. Na het aanmaken deel je de teams in; alles is later nog aan te passen." />
      <Melding zoek={zoek} />
      <form action={maakSeizoen} className="flex flex-col gap-4">
        <ActieVelden org={org} terug={`/${org}/beheer/seizoenen/nieuw`} />
        <Kaart titel="1 · Seizoen">
          <div className="grid gap-3 sm:grid-cols-3">
            <Invoer label="Naam" name="naam" defaultValue={volgendeSeizoensnaam(vorige?.naam)} required />
            <Invoer label="Eerste speeldag" name="startdatum" type="date" />
            <Invoer label="Laatste speeldag" name="einddatum" type="date" />
          </div>
          {seizoenen && seizoenen.length > 0 && (
            <div className="mt-3">
              <Keuze
                label="Teams en spelers overnemen van"
                name="kopieer_van"
                defaultValue={vorige?.id}
                hulp="De spelers blijven bij hun team en de teams komen in de klasse met dezelfde naam. Daarna kun je schuiven."
              >
                <option value="">Niets overnemen, leeg beginnen</option>
                {seizoenen.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.naam}
                  </option>
                ))}
              </Keuze>
            </div>
          )}
        </Kaart>
        <Kaart titel="2 · Klassen van de competitie">
          <Tekstvak
            label="Klassen"
            name="klassen"
            required
            defaultValue={(vorigeKlassen?.length ? vorigeKlassen : ["Klasse A", "Klasse B"]).join("\n")}
            hulp="Eén klasse per regel, de hoogste bovenaan."
          />
        </Kaart>
        <Kaart titel="3 · Toernooien en bekers (optioneel)">
          <Tekstvak
            label="Naam per toernooi"
            name="toernooien"
            defaultValue={vorigeToernooien?.join("\n") ?? ""}
            placeholder="Beker"
            hulp="Eén per regel. De opzet van een toernooi (poules, knockout) stel je later in."
          />
        </Kaart>
        <Knop className="sm:self-start">Seizoen aanmaken en teams indelen</Knop>
      </form>
    </>
  );
}
