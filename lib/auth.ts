import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export interface Gebruiker {
  id: string;
  email: string | undefined;
}

/** De ingelogde gebruiker (JWT geverifieerd via getClaims), of null. */
export async function huidigeGebruiker(): Promise<Gebruiker | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}

export async function vereisGebruiker(terugNaar: string): Promise<Gebruiker> {
  const gebruiker = await huidigeGebruiker();
  if (!gebruiker) redirect(`/login?volgende=${encodeURIComponent(terugNaar)}`);
  return gebruiker;
}

export async function isPlatformBeheerder(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_beheerder");
  return data === true;
}

export async function vereisPlatformBeheerder() {
  const gebruiker = await vereisGebruiker("/platform");
  if (!(await isPlatformBeheerder())) notFound();
  return gebruiker;
}

/**
 * Voor elke beheerpagina én elke beheer-server-action: de organisatie bij de slug,
 * en alleen als de gebruiker daar beheerder is. Anders 404 (we verraden niet
 * welke organisaties bestaan). RLS dwingt het daarnaast ook nog af.
 */
export async function vereisBeheerder(slug: string) {
  const gebruiker = await vereisGebruiker(`/${slug}/beheer`);
  const supabase = await createClient();
  const { data: organisatie } = await supabase.from("organisatie").select("*").eq("slug", slug).maybeSingle();
  if (!organisatie) notFound();
  const { data: magHet } = await supabase.rpc("is_lid", {
    p_organisatie_id: organisatie.id,
    p_rollen: ["beheerder"],
  });
  if (magHet !== true) notFound();
  return { supabase, organisatie, gebruiker };
}
