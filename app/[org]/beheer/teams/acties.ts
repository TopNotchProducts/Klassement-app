"use server";
import { beheerActie, tekst, vinkje } from "@/lib/beheer";
import { foutmelding } from "@/lib/fouten";
import { terugMet } from "@/lib/navigatie";
import { aantal } from "@/lib/tekst";

export async function maakTeams(formData: FormData) {
  const { supabase, organisatie, pad, klaar } = await beheerActie(formData);
  // Eén of meer teams: één naam per regel.
  const namen = [...new Set(tekst(formData, "namen").split(/\r?\n/).map((n) => n.trim()).filter(Boolean))];
  if (namen.length === 0) terugMet(pad, "fout", "Vul minstens één teamnaam in.");
  const { error } = await supabase.from("team").insert(namen.map((naam) => ({ organisatie_id: organisatie.id, naam })));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", namen.length === 1 ? `${namen[0]} is toegevoegd.` : `${aantal(namen.length, "team", "teams")} toegevoegd.`);
}

export async function wijzigTeam(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const naam = tekst(formData, "naam");
  if (!naam) terugMet(pad, "fout", "De naam mag niet leeg zijn.");
  const { error } = await supabase
    .from("team")
    .update({ naam, foto_toestemming: vinkje(formData, "foto_toestemming") })
    .eq("id", tekst(formData, "id"));
  if (error) terugMet(pad, "fout", foutmelding(error));
  klaar();
  terugMet(pad, "ok", "Opgeslagen. De nieuwe naam staat overal, ook bij oude uitslagen.");
}

export async function verwijderTeam(formData: FormData) {
  const { supabase, pad, klaar } = await beheerActie(formData);
  const { error } = await supabase.from("team").delete().eq("id", tekst(formData, "id"));
  if (error)
    terugMet(
      pad,
      "fout",
      foutmelding(error, {
        inGebruik: "Dit team is ingedeeld in een klasse of heeft wedstrijden gespeeld en kan niet worden verwijderd.",
      }),
    );
  klaar();
  terugMet(pad, "ok", "Het team is verwijderd.");
}
