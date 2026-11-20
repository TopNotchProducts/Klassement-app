"use server";
import { beheerActie, tekst } from "@/lib/beheer";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";
import { createAdminClient } from "@/lib/supabase/admin";

const KLEUR = /^#[0-9a-fA-F]{6}$/;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function wijzigHuisstijl(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  const kleur1 = tekst(formData, "kleur_primair");
  const kleur2 = tekst(formData, "kleur_secundair");
  if (!naam) terugMet(pad, "fout", "De naam mag niet leeg zijn.");
  if (!KLEUR.test(kleur1) || !KLEUR.test(kleur2)) terugMet(pad, "fout", "Kies twee geldige kleuren.");

  const wijziging: { naam: string; kleur_primair: string; kleur_secundair: string; logo_url?: string | null } = {
    naam,
    kleur_primair: kleur1,
    kleur_secundair: kleur2,
  };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const ext = TYPES[logo.type];
    if (!ext) terugMet(pad, "fout", "Het logo moet een PNG-, JPG- of WebP-afbeelding zijn.");
    if (logo.size > 1024 * 1024) terugMet(pad, "fout", "Het logo mag maximaal 1 MB zijn.");
    // Service role: beheerActie heeft gecontroleerd dat de gebruiker beheerder is.
    const opslag = createAdminClient().storage.from("logo");
    const pad_ = `${organisatie.id}/logo-${Date.now()}.${ext}`;
    const { error } = await opslag.upload(pad_, logo, { contentType: logo.type, upsert: false });
    if (error) terugMet(pad, "fout", "Het uploaden van het logo is mislukt. Probeer het opnieuw.");
    wijziging.logo_url = opslag.getPublicUrl(pad_).data.publicUrl;
    // Oude logo's van deze organisatie opruimen.
    const { data: oud } = await opslag.list(organisatie.id);
    const weg = (oud ?? []).map((f) => `${organisatie.id}/${f.name}`).filter((p) => p !== pad_);
    if (weg.length) await opslag.remove(weg);
  } else if (formData.get("logo_weg") === "on") {
    wijziging.logo_url = null;
  }

  const { error } = await supabase.from("organisatie").update(wijziging).eq("id", organisatie.id);
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "De huisstijl is opgeslagen.");
}
