// Healthcheck: controleert server-side of de app Supabase bereikt. Geeft geen keys of URL's terug.
import { connection } from "next/server";

export async function GET() {
  // Altijd op request-tijd draaien, nooit prerenderen (cacheComponents staat aan).
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ ok: false, supabase: "env-vars ontbreken" }, { status: 500 });
  }
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });
    return Response.json(
      { ok: res.ok, supabase: res.ok ? "bereikbaar" : `status ${res.status}` },
      { status: res.ok ? 200 : 502 },
    );
  } catch {
    return Response.json({ ok: false, supabase: "niet bereikbaar" }, { status: 502 });
  }
}
