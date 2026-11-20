import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Zonder env-vars (bijv. in CI) wordt deze test overgeslagen.
describe.skipIf(!url || !anonKey)("verbinding met klassement-dev", () => {
  it("de auth-healthcheck antwoordt", async () => {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey! },
    });
    expect(res.status).toBe(200);
  });
});
