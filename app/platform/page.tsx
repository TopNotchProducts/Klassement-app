import type { Metadata } from "next";
import Link from "next/link";
import { vereisPlatformBeheerder } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Invoer, Kaart, Knop, Melding, PaginaKop } from "@/components/ui";
import { maakOrganisatie, voegBeheerderToe } from "./acties";
import { SlugVelden } from "./slug-velden";

export const metadata: Metadata = { title: "Platformbeheer · Klassement" };

export default async function Platform({ searchParams }: PageProps<"/platform">) {
  await vereisPlatformBeheerder();
  const zoek = await searchParams;
  const supabase = await createClient();
  const { data: organisaties } = await supabase.from("organisatie").select("id, naam, slug").order("naam");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-zinc-600 underline">
        ← Start
      </Link>
      <PaginaKop titel="Platformbeheer" uitleg="Organisaties aanmaken en de eerste beheerder toevoegen." />
      <Melding zoek={zoek} />
      <div className="flex flex-col gap-4">
        <Kaart titel="Nieuwe organisatie">
          <form action={maakOrganisatie} className="flex flex-col gap-4">
            <SlugVelden />
            <Knop>Organisatie aanmaken</Knop>
          </form>
        </Kaart>
        {(organisaties ?? []).map((o) => (
          <Kaart key={o.id} titel={o.naam}>
            <p className="mb-3 text-sm text-zinc-600">
              Webadres: <Link className="underline" href={`/${o.slug}/beheer`}>/{o.slug}</Link>
            </p>
            <form action={voegBeheerderToe} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="organisatie_id" value={o.id} />
              <div className="flex-1">
                <Invoer label="Beheerder toevoegen (e-mailadres)" name="email" type="email" required />
              </div>
              <Knop soort="secundair">Toevoegen</Knop>
            </form>
          </Kaart>
        ))}
      </div>
    </main>
  );
}
