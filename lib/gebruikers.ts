import "server-only";
import { createAdminClient } from "./supabase/admin";

/**
 * Zoekt een gebruiker op e-mailadres of maakt hem aan (bevestigd, zonder
 * wachtwoord); daarna logt hij in met een magic link. Er gaat geen mail uit.
 * Service role: alleen aanroepen nadat de bevoegdheid van de aanroeper is gecontroleerd.
 */
export async function vindOfMaakGebruiker(email: string): Promise<string> {
  const admin = createAdminClient();
  const schoon = email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.createUser({ email: schoon, email_confirm: true });
  if (!error) return data.user.id;
  if (error.code !== "email_exists") throw error;

  for (let page = 1; page < 100; page++) {
    const { data: lijst, error: fout } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (fout) throw fout;
    const gevonden = lijst.users.find((u) => u.email?.toLowerCase() === schoon);
    if (gevonden) return gevonden.id;
    if (lijst.users.length < 200) break;
  }
  throw new Error("gebruiker bestaat maar is niet gevonden");
}

/** E-mailadressen bij user-id's (voor de ledenlijst). */
export async function emailsVan(userIds: string[]): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const resultaat = new Map<string, string>();
  for (const id of new Set(userIds)) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) resultaat.set(id, data.user.email);
  }
  return resultaat;
}
