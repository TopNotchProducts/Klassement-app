import "server-only";
// Supabase-client voor server components, server actions en route handlers.
// Werkt namens de ingelogde gebruiker (anon key + sessiecookie), dus RLS geldt.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Aangeroepen vanuit een server component: daar kunnen geen cookies
            // gezet worden. proxy.ts ververst de sessie, dus dit is veilig.
          }
        },
      },
    },
  );
}
