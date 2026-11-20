"use server";
import { beheerActie, getalOfNull, tekst } from "@/lib/beheer";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";

export async function maakLocatie(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "Vul de naam van de locatie in.");
  const { data, error } = await supabase
    .from("locatie")
    .insert({ organisatie_id: organisatie.id, naam, plaats: tekst(formData, "plaats") || null })
    .select("id")
    .single();
  if (error) terugMet(pad, "fout", foutmelding(error));
  // Een locatie zonder veld is onbruikbaar: maak direct "Veld 1" aan.
  await supabase.from("veld").insert({ organisatie_id: organisatie.id, locatie_id: data.id, naam: "Veld 1", volgorde: 1 });
  klaar();
  terugMet(pad, "ok", `${naam} is toegevoegd, met één veld. Voeg zo nodig meer velden toe.`);
}

export async function wijzigLocatie(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "De naam mag niet leeg zijn.");
  const { error } = await supabase
    .from("locatie")
    .update({ naam, plaats: tekst(formData, "plaats") || null })
    .eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Opgeslagen.");
}

export async function verwijderLocatie(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const { error } = await supabase.from("locatie").delete().eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "De locatie is verwijderd.");
}

export async function maakVeld(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "Vul de naam van het veld in.");
  const { error } = await supabase.from("veld").insert({
    organisatie_id: organisatie.id,
    locatie_id: tekst(formData, "locatie_id"),
    naam,
    volgorde: getalOfNull(formData, "volgorde") ?? 0,
  });
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", `${naam} is toegevoegd.`);
}

export async function wijzigVeld(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "De naam mag niet leeg zijn.");
  const { error } = await supabase.from("veld").update({ naam }).eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Opgeslagen.");
}

export async function verwijderVeld(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const { error } = await supabase.from("veld").delete().eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Het veld is verwijderd.");
}
