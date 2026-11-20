import Link from "next/link";
import { vereisBeheerder } from "@/lib/auth";
import { Kaart, Leeg, PaginaKop } from "@/components/ui";
import { kiesSeizoen } from "../seizoen-keuze";
import { ImportFormulier } from "./formulier";

export default async function Import({ params, searchParams }: PageProps<"/[org]/beheer/spelers/import">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: seizoenen } = await supabase.from("seizoen").select("id, naam, status, startdatum").eq("organisatie_id", organisatie.id);
  const seizoen = kiesSeizoen(seizoenen ?? [], zoek.seizoen);

  return (
    <>
      <Link href={`/${org}/beheer/spelers`} className="mb-3 inline-block text-sm text-zinc-600 underline">
        ← Spelers
      </Link>
      <PaginaKop
        titel="Spelers importeren"
        uitleg={
          <>
            Sla je lijst in Excel op als <strong>CSV</strong> met de kolommen <strong>naam</strong>, <strong>rugnummer</strong>{" "}
            en <strong>team</strong>. Bestaande spelers (zelfde naam) worden bijgewerkt, niet dubbel aangemaakt.
          </>
        }
      />
      {seizoen ? (
        <Kaart titel={`Indelen in seizoen ${seizoen.naam}`}>
          <ImportFormulier org={org} seizoenId={seizoen.id} />
        </Kaart>
      ) : (
        <Leeg>
          Maak eerst een <Link className="underline" href={`/${org}/beheer/seizoenen/nieuw`}>seizoen</Link> aan.
        </Leeg>
      )}
    </>
  );
}
