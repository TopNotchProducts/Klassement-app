"use server";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/auth";
import { leesSpelersCsv, type CsvFout } from "@/lib/csv";
import { foutmelding } from "@/lib/fouten";
import { aantal } from "@/lib/tekst";

export interface ImportStatus {
  stap: "begin" | "controle" | "klaar";
  tekst: string;
  regels: { regel: number; naam: string; rugnummer: number | null; team: string; actie: "nieuw" | "bijwerken" }[];
  fouten: CsvFout[];
  nieuweTeams: string[];
  melding?: string;
}

/** Stap 1 "controleren" toont wat er gaat gebeuren; stap 2 "importeren" voert het uit. */
export async function importeerSpelers(vorige: ImportStatus, formData: FormData): Promise<ImportStatus> {
  const slug = String(formData.get("org") ?? "");
  const { supabase, organisatie } = await vereisBeheerder(slug);
  const seizoenId = String(formData.get("seizoen_id") ?? "");
  const maakTeams = formData.get("maak_teams") === "on";
  const bestand = formData.get("bestand");
  const tekst =
    bestand instanceof File && bestand.size > 0 ? await bestand.text() : String(formData.get("tekst") ?? "");
  const leeg = { stap: "begin" as const, tekst, regels: [], fouten: [], nieuweTeams: [] };

  if (!seizoenId) return { ...leeg, melding: "Maak eerst een seizoen aan; spelers worden per seizoen bij een team ingedeeld." };
  if (tekst.length > 500_000) return { ...leeg, melding: "Het bestand is te groot." };

  const { rijen, fouten } = leesSpelersCsv(tekst);
  const [{ data: teams }, { data: spelers }] = await Promise.all([
    supabase.from("team").select("id, naam").eq("organisatie_id", organisatie.id),
    supabase.from("speler").select("id, naam").eq("organisatie_id", organisatie.id),
  ]);
  const teamId = new Map((teams ?? []).map((t) => [t.naam.toLowerCase(), t.id]));
  const spelerId = new Map((spelers ?? []).map((s) => [s.naam.toLowerCase(), s.id]));

  const gezien = new Set<string>();
  const geldig = rijen.filter((r) => {
    const sleutel = r.naam.toLowerCase();
    if (gezien.has(sleutel)) {
      fouten.push({ regel: r.regel, melding: `${r.naam} staat twee keer in het bestand.` });
      return false;
    }
    gezien.add(sleutel);
    return true;
  });
  const nieuweTeams = [...new Set(geldig.filter((r) => !teamId.has(r.team.toLowerCase())).map((r) => r.team))];
  const regels = geldig.map((r) => ({ ...r, actie: spelerId.has(r.naam.toLowerCase()) ? ("bijwerken" as const) : ("nieuw" as const) }));

  if (formData.get("stap") !== "importeren" || geldig.length === 0) {
    return { stap: "controle", tekst, regels, fouten: fouten.sort((a, b) => a.regel - b.regel), nieuweTeams };
  }
  if (nieuweTeams.length && !maakTeams) {
    return {
      stap: "controle",
      tekst,
      regels,
      fouten,
      nieuweTeams,
      melding: "Sommige teams bestaan nog niet. Vink aan dat ze aangemaakt mogen worden, of pas de namen aan.",
    };
  }

  // Uitvoeren. Ontbrekende teams eerst.
  if (nieuweTeams.length) {
    const { data, error } = await supabase
      .from("team")
      .insert(nieuweTeams.map((naam) => ({ organisatie_id: organisatie.id, naam })))
      .select("id, naam");
    if (error) return { ...leeg, stap: "controle", regels, fouten, nieuweTeams, melding: foutmelding(error) };
    for (const t of data) teamId.set(t.naam.toLowerCase(), t.id);
  }
  const nieuw = regels.filter((r) => r.actie === "nieuw");
  if (nieuw.length) {
    const { data, error } = await supabase
      .from("speler")
      .insert(nieuw.map((r) => ({ organisatie_id: organisatie.id, naam: r.naam, rugnummer: r.rugnummer })))
      .select("id, naam");
    if (error) return { ...leeg, stap: "controle", regels, fouten, nieuweTeams, melding: foutmelding(error) };
    for (const s of data) spelerId.set(s.naam.toLowerCase(), s.id);
  }
  for (const r of regels.filter((x) => x.actie === "bijwerken" && x.rugnummer !== null)) {
    await supabase.from("speler").update({ rugnummer: r.rugnummer }).eq("id", spelerId.get(r.naam.toLowerCase())!);
  }
  const { error } = await supabase.from("selectie").upsert(
    regels.map((r) => ({
      organisatie_id: organisatie.id,
      seizoen_id: seizoenId,
      speler_id: spelerId.get(r.naam.toLowerCase())!,
      team_id: teamId.get(r.team.toLowerCase())!,
    })),
    { onConflict: "seizoen_id,speler_id" },
  );
  if (error) return { ...leeg, stap: "controle", regels, fouten, nieuweTeams, melding: foutmelding(error) };

  revalidatePath(`/${slug}/beheer`, "layout");
  return {
    stap: "klaar",
    tekst: "",
    regels,
    fouten,
    nieuweTeams,
    melding: `${aantal(nieuw.length, "nieuwe speler", "nieuwe spelers")}, ${regels.length - nieuw.length} bijgewerkt${nieuweTeams.length ? `, ${aantal(nieuweTeams.length, "nieuw team", "nieuwe teams")}` : ""}.`,
  };
}
