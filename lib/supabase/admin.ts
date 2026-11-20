import "server-only";
// Service-role-client. ALLEEN in server actions en scripts, nooit client-side.
// Omzeilt RLS: controleer altijd eerst zelf de bevoegdheid van de aanroeper.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
