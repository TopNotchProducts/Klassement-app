import Link from "next/link";
import { vereisBeheerder } from "@/lib/auth";
import { Kaart, PaginaKop } from "@/components/ui";
import { aantal } from "@/lib/tekst";

/** Overzicht met een stappenlijst, zodat een nieuwe beheerder weet waar te beginnen. */
export default async function Overzicht({ params }: PageProps<"/[org]/beheer">) {
  const { org } = await params;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const tel = async (tabel: "locatie" | "veld" | "team" | "speler" | "seizoen") => {
    const { count } = await supabase
      .from(tabel)
      .select("*", { count: "exact", head: true })
      .eq("organisatie_id", organisatie.id);
    return count ?? 0;
  };
  const [locaties, velden, teams, spelers, seizoenen] = await Promise.all([
    tel("locatie"),
    tel("veld"),
    tel("team"),
    tel("speler"),
    tel("seizoen"),
  ]);
  const basis = `/${org}/beheer`;
  const stappen = [
    { klaar: locaties > 0 && velden > 0, titel: "Locaties en velden", tekst: `${aantal(locaties, "locatie", "locaties")}, ${aantal(velden, "veld", "velden")}`, href: `${basis}/locaties` },
    { klaar: teams > 0, titel: "Teams", tekst: aantal(teams, "team", "teams"), href: `${basis}/teams` },
    { klaar: seizoenen > 0, titel: "Seizoen aanmaken", tekst: aantal(seizoenen, "seizoen", "seizoenen"), href: `${basis}/seizoenen` },
    { klaar: spelers > 0, titel: "Spelers", tekst: aantal(spelers, "speler", "spelers"), href: `${basis}/spelers` },
  ];

  return (
    <>
      <PaginaKop titel="Overzicht" uitleg="Zet je competitie op in deze volgorde. Je kunt later altijd terug." />
      <Kaart>
        <ol className="flex flex-col divide-y divide-zinc-100">
          {stappen.map((s, i) => (
            <li key={s.href}>
              <Link href={s.href} className="flex min-h-16 items-center gap-4 py-2 hover:bg-zinc-50">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    s.klaar ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                  aria-label={s.klaar ? "klaar" : "nog te doen"}
                >
                  {s.klaar ? "✓" : i + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-medium text-zinc-900">{s.titel}</span>
                  <span className="text-sm text-zinc-500">{s.tekst}</span>
                </span>
                <span aria-hidden className="text-zinc-400">›</span>
              </Link>
            </li>
          ))}
        </ol>
      </Kaart>
    </>
  );
}
