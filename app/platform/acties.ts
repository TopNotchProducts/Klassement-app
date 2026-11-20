"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { vereisPlatformBeheerder } from "@/lib/auth";
import { controleerSlug } from "@/lib/slug";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { vindOfMaakGebruiker } from "@/lib/gebruikers";

export async function maakOrganisatie(formData: FormData) {
  await vereisPlatformBeheerder();
  const naam = String(formData.get("naam") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!naam) terugMet("/platform", "fout", "Vul de naam van de organisatie in.");
  const slugFout = controleerSlug(slug);
  if (slugFout) terugMet("/platform", "fout", slugFout);

  const supabase = await createClient();
  const { error } = await supabase.from("organisatie").insert({ naam, slug });
  if (error) terugMet("/platform", "fout", foutmelding(error, { bestaatAl: `Het webadres "${slug}" is al in gebruik.` }));
  revalidatePath("/platform");
  terugMet("/platform", "ok", `${naam} is aangemaakt.`);
}

const beheerderSchema = z.object({ organisatie_id: z.uuid(), email: z.email() });

export async function voegBeheerderToe(formData: FormData) {
  await vereisPlatformBeheerder();
  const invoer = beheerderSchema.safeParse({
    organisatie_id: formData.get("organisatie_id"),
    email: String(formData.get("email") ?? "").trim(),
  });
  if (!invoer.success) terugMet("/platform", "fout", "Vul een geldig e-mailadres in.");

  const userId = await vindOfMaakGebruiker(invoer.data.email);
  // Service role: de platformbeheerder is hierboven gecontroleerd.
  const { error } = await createAdminClient()
    .from("organisatie_lid")
    .insert({ organisatie_id: invoer.data.organisatie_id, user_id: userId, rol: "beheerder" });
  if (error) terugMet("/platform", "fout", foutmelding(error, { bestaatAl: "Deze persoon is daar al beheerder." }));
  revalidatePath("/platform");
  terugMet("/platform", "ok", `${invoer.data.email} is beheerder. Inloggen kan via /login.`);
}
