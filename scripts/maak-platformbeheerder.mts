// Maakt (of vindt) een gebruiker en maakt hem platformbeheerder.
// Gebruik (alleen tegen klassement-dev; productie voert Bart zelf uit):
//   node --env-file=.env.local scripts/maak-platformbeheerder.mts <e-mailadres>
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Gebruik: node --env-file=.env.local scripts/maak-platformbeheerder.mts <e-mailadres>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY ontbreken (.env.local).");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function vindOfMaak(): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!error) return data.user.id;
  if (error.code !== "email_exists") throw error;
  for (let page = 1; ; page++) {
    const { data: lijst, error: fout } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (fout) throw fout;
    const u = lijst.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (lijst.users.length < 200) throw new Error("gebruiker niet gevonden");
  }
}

const userId = await vindOfMaak();
const { error } = await admin.from("platform_beheerder").upsert({ user_id: userId });
if (error) throw error;
console.log(`Klaar: ${email} is platformbeheerder in ${new URL(url).hostname.split(".")[0]}.`);
