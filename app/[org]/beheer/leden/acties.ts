"use server";
import { z } from "zod";
import { beheerActie, tekst } from "@/lib/beheer";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";
import { vindOfMaakGebruiker } from "@/lib/gebruikers";

const schema = z.object({ email: z.email(), rol: z.enum(["beheerder", "scheidsrechter", "aanvoerder"]) });

export async function voegLidToe(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  const invoer = schema.safeParse({ email: tekst(formData, "email"), rol: tekst(formData, "rol") });
  if (!invoer.success) terugMet(pad, "fout", "Vul een geldig e-mailadres in en kies een rol.");
  // Service role alleen om het account te vinden of aan te maken; het lidmaatschap
  // zelf schrijven we als de ingelogde beheerder (RLS).
  const userId = await vindOfMaakGebruiker(invoer.data.email);
  const { error } = await supabase
    .from("organisatie_lid")
    .insert({ organisatie_id: organisatie.id, user_id: userId, rol: invoer.data.rol });
  if (error) terugMet(pad, "fout", foutmelding(error, { bestaatAl: "Deze persoon heeft deze rol al." }));
  klaar();
  terugMet(pad, "ok", `${invoer.data.email} is toegevoegd. Inloggen gaat met een link via de inlogpagina.`);
}

export async function verwijderLid(formData: FormData) {
  const { supabase, organisatie, gebruiker, pad, klaar } = await beheerActie(formData);
  const id = tekst(formData, "id");
  const { data: lid } = await supabase.from("organisatie_lid").select("user_id, rol").eq("id", id).maybeSingle();
  if (lid?.rol === "beheerder") {
    const { count } = await supabase
      .from("organisatie_lid")
      .select("id", { count: "exact", head: true })
      .eq("organisatie_id", organisatie.id)
      .eq("rol", "beheerder");
    if ((count ?? 0) <= 1) terugMet(pad, "fout", "Er moet minstens één beheerder overblijven.");
    if (lid.user_id === gebruiker.id) terugMet(pad, "fout", "Je kunt jezelf niet als beheerder verwijderen. Vraag een andere beheerder.");
  }
  const { error } = await supabase.from("organisatie_lid").delete().eq("id", id);
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Verwijderd.");
}
