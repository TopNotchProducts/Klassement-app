"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { terugMet, veiligPad } from "@/lib/navigatie";

const schema = z.object({ email: z.email(), volgende: z.string().optional() });

export async function stuurInloglink(formData: FormData) {
  const invoer = schema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    volgende: String(formData.get("volgende") ?? ""),
  });
  const volgende = veiligPad(invoer.data?.volgende);
  const hier = `/login?volgende=${encodeURIComponent(volgende)}`;
  if (!invoer.success) terugMet(hier, "fout", "Vul een geldig e-mailadres in.");

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: invoer.data.email,
    options: {
      // Geen self-signup: alleen bestaande gebruikers (uitgenodigd door een beheerder).
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?volgende=${encodeURIComponent(volgende)}`,
    },
  });
  // Geen onderscheid tussen "bestaat niet" en "verstuurd": verraadt geen accounts.
  if (error && error.status === 429) terugMet(hier, "fout", "Te veel pogingen. Wacht even en probeer het opnieuw.");
  terugMet(hier, "ok", "Als dit adres bij ons bekend is, staat er nu een inloglink in je mailbox.");
}
