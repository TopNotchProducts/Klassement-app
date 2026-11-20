import "server-only";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "./auth";
import { veiligPad } from "./navigatie";

/**
 * Start van elke beheer-server-action. Leest de slug (`org`) en de terugkeerpagina
 * (`terug`) uit het formulier en controleert opnieuw dat de gebruiker beheerder is:
 * een server action is een publiek endpoint, de pagina-check alleen is niet genoeg.
 */
export async function beheerActie(formData: FormData) {
  const slug = String(formData.get("org") ?? "");
  const ctx = await vereisBeheerder(slug);
  const pad = veiligPad(String(formData.get("terug") ?? ""), `/${slug}/beheer`);
  const klaar = () => revalidatePath(`/${slug}/beheer`, "layout");
  return { ...ctx, slug, pad, klaar };
}

export function tekst(formData: FormData, veld: string): string {
  return String(formData.get(veld) ?? "").trim();
}

export function getalOfNull(formData: FormData, veld: string): number | null {
  const t = tekst(formData, veld);
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : NaN;
}

export function vinkje(formData: FormData, veld: string): boolean {
  return formData.get(veld) === "on";
}
