import Link from "next/link";
import { vereisBeheerder } from "@/lib/auth";
import { STATUS_TEKST } from "@/lib/seizoen";
import { Kaart, KnopLink, Leeg, Melding, PaginaKop } from "@/components/ui";

export default async function Seizoenen({ params, searchParams }: PageProps<"/[org]/beheer/seizoenen">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const { data: seizoenen } = await supabase
    .from("seizoen")
    .select("id, naam, status, startdatum, onderdeel (naam, vorm)")
    .eq("organisatie_id", organisatie.id)
    .order("startdatum", { ascending: false, nullsFirst: true })
    .order("naam", { ascending: false });

  return (
    <>
      <PaginaKop
        titel="Seizoenen"
        uitleg="Per seizoen kies je de klassen en onderdelen (competitie, beker) en deel je de teams in."
        actie={<KnopLink href={`/${org}/beheer/seizoenen/nieuw`}>Nieuw seizoen</KnopLink>}
      />
      <Melding zoek={zoek} />
      {(seizoenen ?? []).length === 0 && <Leeg>Nog geen seizoenen. Begin met “Nieuw seizoen”.</Leeg>}
      <ul className="flex flex-col gap-3">
        {(seizoenen ?? []).map((s) => (
          <li key={s.id}>
            <Link href={`/${org}/beheer/seizoenen/${s.id}`}>
              <Kaart className="hover:border-zinc-400">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold">{s.naam}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      s.status === "actief" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {STATUS_TEKST[s.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">{s.onderdeel.map((o) => o.naam).join(" · ")}</p>
              </Kaart>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
