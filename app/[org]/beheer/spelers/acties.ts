"use server";
import { beheerActie, getalOfNull, tekst, vinkje } from "@/lib/beheer";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function rugnummer(formData: FormData, pad: string) {
  const n = getalOfNull(formData, "rugnummer");
  if (Number.isNaN(n) || (n !== null && (n < 0 || n > 999))) terugMet(pad, "fout", "Het rugnummer moet een getal van 0 tot 999 zijn.");
  return n;
}

/** Zet de selectie van een speler in een seizoen: team kiezen, wisselen (overschrijven) of leeg. */
async function zetSelectie(supabase: Supabase, organisatieId: string, seizoenId: string, spelerId: string, teamId: string) {
  if (!seizoenId) return null;
  if (!teamId) {
    const { error } = await supabase.from("selectie").delete().eq("seizoen_id", seizoenId).eq("speler_id", spelerId);
    return error;
  }
  const { error } = await supabase
    .from("selectie")
    .upsert(
      { organisatie_id: organisatieId, seizoen_id: seizoenId, speler_id: spelerId, team_id: teamId },
      { onConflict: "seizoen_id,speler_id" },
    );
  return error;
}

export async function maakSpeler(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "Vul de naam van de speler in.");
  const { data, error } = await supabase
    .from("speler")
    .insert({
      organisatie_id: organisatie.id,
      naam,
      rugnummer: rugnummer(formData, pad),
      verborgen: vinkje(formData, "verborgen"),
      foto_toestemming: vinkje(formData, "foto_toestemming"),
    })
    .select("id")
    .single();
  if (error) terugMet(pad, "fout", foutmelding(error));
  const fout = await zetSelectie(supabase, organisatie.id, tekst(formData, "seizoen_id"), data.id, tekst(formData, "team_id"));
  if (fout) terugMet(pad, "fout", foutmelding(fout));
  klaar();
  terugMet(pad, "ok", `${naam} is toegevoegd.`);
}

export async function wijzigSpeler(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const id = tekst(formData, "id");
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "De naam mag niet leeg zijn.");
  const { error } = await supabase
    .from("speler")
    .update({
      naam,
      rugnummer: rugnummer(formData, pad),
      verborgen: vinkje(formData, "verborgen"),
      foto_toestemming: vinkje(formData, "foto_toestemming"),
    })
    .eq("id", id);
  if (error) terugMet(pad, "fout", foutmelding(error));
  const fout = await zetSelectie(supabase, organisatie.id, tekst(formData, "seizoen_id"), id, tekst(formData, "team_id"));
  if (fout) terugMet(pad, "fout", foutmelding(fout));
  klaar();
  terugMet(pad, "ok", `${naam} is opgeslagen.`);
}

export async function verwijderSpeler(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const { error } = await supabase.from("speler").delete().eq("id", tekst(formData, "id"));
  if (error)
    terugMet(
      pad,
      "fout",
      foutmelding(error, {
        inGebruik: "Deze speler heeft al doelpunten of kaarten en kan niet worden verwijderd. Vink “verbergen” aan als hij niet meer zichtbaar mag zijn.",
      }),
    );
  klaar();
  terugMet(pad, "ok", "De speler is verwijderd.");
}
