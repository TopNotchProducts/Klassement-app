"use server";
import { beheerActie, tekst } from "@/lib/beheer";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";
import { redirect } from "next/navigation";

const regels = (t: string) => t.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);

export async function maakSeizoen(formData: FormData) {
  const { supabase, organisatie, slug, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "Vul de naam van het seizoen in.");
  const klassen = regels(tekst(formData, "klassen"));
  if (klassen.length === 0) terugMet(pad, "fout", "Vul minstens één klasse in.");
  const kopieerVan = tekst(formData, "kopieer_van");

  const { data: seizoenId, error } = await supabase.rpc("maak_seizoen", {
    p_organisatie_id: organisatie.id,
    p_naam: naam,
    p_startdatum: tekst(formData, "startdatum") || undefined,
    p_einddatum: tekst(formData, "einddatum") || undefined,
    p_klassen: klassen,
    p_kopieer_van: kopieerVan || undefined,
    p_toernooien: regels(tekst(formData, "toernooien")),
  });
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  redirect(`/${slug}/beheer/seizoenen/${seizoenId}/indelen?ok=${encodeURIComponent(`${naam} is aangemaakt. Deel nu de teams in.`)}`);
}

export async function wijzigSeizoen(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const status = tekst(formData, "status");
  if (!["concept", "actief", "afgesloten"].includes(status)) terugMet(pad, "fout", "Onbekende status.");
  const { error } = await supabase
    .from("seizoen")
    .update({
      naam: tekst(formData, "naam"),
      startdatum: tekst(formData, "startdatum") || null,
      einddatum: tekst(formData, "einddatum") || null,
      status: status as "concept" | "actief" | "afgesloten",
    })
    .eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Opgeslagen.");
}

export async function maakKlasse(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "Vul de naam van de klasse in.");
  const { error } = await supabase.from("poule").insert({
    organisatie_id: organisatie.id,
    fase_id: tekst(formData, "fase_id"),
    naam,
    volgorde: Number(tekst(formData, "volgorde")) || 0,
  });
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", `${naam} is toegevoegd.`);
}

export async function wijzigKlasse(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "De naam mag niet leeg zijn.");
  const { error } = await supabase.from("poule").update({ naam }).eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Opgeslagen.");
}

export async function verwijderKlasse(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const id = tekst(formData, "id");
  const { count } = await supabase.from("wedstrijd").select("id", { count: "exact", head: true }).eq("poule_id", id);
  if (count) terugMet(pad, "fout", "Deze klasse heeft al wedstrijden en kan niet worden verwijderd.");
  const { error } = await supabase.from("poule").delete().eq("id", id);
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "De klasse is verwijderd; de teams erin zijn niet meer ingedeeld.");
}

export async function maakOnderdeel(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "Vul een naam in, bijvoorbeeld Beker.");
  const { error } = await supabase.from("onderdeel").insert({
    organisatie_id: organisatie.id,
    seizoen_id: tekst(formData, "seizoen_id"),
    naam,
    vorm: "toernooi",
    volgorde: Number(tekst(formData, "volgorde")) || 1,
  });
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", `${naam} is toegevoegd.`);
}

export async function verwijderOnderdeel(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const id = tekst(formData, "id");
  const { data: fasen } = await supabase.from("fase").select("id").eq("onderdeel_id", id);
  const faseIds = (fasen ?? []).map((f) => f.id);
  if (faseIds.length) {
    const { count } = await supabase.from("wedstrijd").select("id", { count: "exact", head: true }).in("fase_id", faseIds);
    if (count) terugMet(pad, "fout", "Dit onderdeel heeft al wedstrijden en kan niet worden verwijderd.");
  }
  const { error } = await supabase.from("onderdeel").delete().eq("id", id);
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Het onderdeel is verwijderd.");
}

export async function maakSpeelmoment(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const soort = tekst(formData, "soort");
  const weekdag = soort === "wekelijks" ? Number(tekst(formData, "weekdag")) : null;
  const datum = soort === "datum" ? tekst(formData, "datum") : null;
  if (soort === "datum" && !datum) terugMet(pad, "fout", "Kies een datum.");
  const starttijden = [...new Set(tekst(formData, "starttijden").split(/[\s,;]+/).filter(Boolean))].sort();
  if (starttijden.length === 0 || starttijden.some((t) => !/^([01]?\d|2[0-3])[:.][0-5]\d$/.test(t)))
    terugMet(pad, "fout", "Vul de starttijden in als 19:00, 20:00, 21:00.");
  const velden = formData.getAll("velden").map(String);
  if (velden.length === 0) terugMet(pad, "fout", "Kies minstens één veld.");
  const { error } = await supabase.from("speelmoment").insert({
    organisatie_id: organisatie.id,
    seizoen_id: tekst(formData, "seizoen_id"),
    weekdag,
    datum,
    starttijden: starttijden.map((t) => t.replace(".", ":").padStart(5, "0")),
    velden,
  });
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Het speelmoment is toegevoegd.");
}

export async function verwijderSpeelmoment(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const { error } = await supabase.from("speelmoment").delete().eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Het speelmoment is verwijderd.");
}

export async function deelKlassenIn(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const indeling: Record<string, string> = {};
  for (const [sleutel, waarde] of formData.entries()) {
    if (sleutel.startsWith("team:")) indeling[sleutel.slice(5)] = String(waarde);
  }
  const { error } = await supabase.rpc("deel_klassen_in", { p_fase_id: tekst(formData, "fase_id"), p_indeling: indeling });
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "De indeling is opgeslagen.");
}
