import Link from "next/link";
import { huidigeGebruiker, isPlatformBeheerder } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KnopLink } from "@/components/ui";

export default async function Start() {
  const gebruiker = await huidigeGebruiker();
  if (!gebruiker) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Klassement</h1>
        <p className="text-zinc-600">Competitiebeheer voor clubs</p>
        <KnopLink href="/login">Inloggen</KnopLink>
      </main>
    );
  }

  const supabase = await createClient();
  const [{ data: lidmaatschappen }, platform] = await Promise.all([
    supabase
      .from("organisatie_lid")
      .select("rol, organisatie:organisatie_id (naam, slug)")
      .eq("user_id", gebruiker.id),
    isPlatformBeheerder(),
  ]);
  const organisaties = new Map<string, { naam: string; rollen: string[] }>();
  for (const l of lidmaatschappen ?? []) {
    if (!l.organisatie) continue;
    const o = organisaties.get(l.organisatie.slug) ?? { naam: l.organisatie.naam, rollen: [] };
    o.rollen.push(l.rol);
    organisaties.set(l.organisatie.slug, o);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Klassement</h1>
        <form action="/uitloggen" method="post">
          <button className="min-h-11 px-2 text-sm text-zinc-600 underline">Uitloggen</button>
        </form>
      </div>
      <p className="mb-4 text-zinc-600">Ingelogd als {gebruiker.email}</p>
      <ul className="flex flex-col gap-3">
        {[...organisaties].map(([slug, o]) => (
          <li key={slug}>
            <Link
              href={o.rollen.includes("beheerder") ? `/${slug}/beheer` : `/${slug}`}
              className="flex min-h-14 items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 shadow-sm hover:border-zinc-400"
            >
              <span className="font-medium">{o.naam}</span>
              <span className="text-sm text-zinc-500">{o.rollen.join(", ")}</span>
            </Link>
          </li>
        ))}
        {platform && (
          <li>
            <Link
              href="/platform"
              className="flex min-h-14 items-center rounded-xl border border-dashed border-zinc-300 px-4 text-zinc-700 hover:border-zinc-500"
            >
              Platformbeheer: alle organisaties
            </Link>
          </li>
        )}
      </ul>
      {organisaties.size === 0 && !platform && (
        <p className="text-zinc-600">Je bent nog geen lid van een organisatie. Vraag je bestuur om je toe te voegen.</p>
      )}
    </main>
  );
}
