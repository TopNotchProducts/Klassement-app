// Testhulpen tegen klassement-dev. Alleen voor tests: gebruikt de service role key.
// Elke test maakt eigen organisaties (slug-prefix `test-`) en gebruikers aan en
// ruimt die zelf weer op; andere organisaties worden nooit aangeraakt.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const heeftDatabase = Boolean(url && anonKey && serviceKey);

const opties = { auth: { persistSession: false, autoRefreshToken: false } };

export function serviceClient(): SupabaseClient {
  return createClient(url!, serviceKey!, opties);
}

export function anonClient(): SupabaseClient {
  return createClient(url!, anonKey!, opties);
}

export function kort(): string {
  return randomUUID().slice(0, 8);
}

export interface TestGebruiker {
  id: string;
  email: string;
  client: SupabaseClient;
}

/** Maakt een bevestigde gebruiker aan en geeft een ingelogde client terug. */
export async function maakGebruiker(label: string): Promise<TestGebruiker> {
  const svc = serviceClient();
  const email = `test-${label}-${kort()}@example.com`;
  const password = `Tst-${randomUUID()}`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = anonClient();
  const { error: loginFout } = await client.auth.signInWithPassword({ email, password });
  if (loginFout) throw loginFout;
  return { id: data.user.id, email, client };
}

export async function maakOrganisatie(label: string): Promise<{ id: string; slug: string }> {
  const slug = `test-${label}-${kort()}`;
  const { data, error } = await serviceClient()
    .from("organisatie")
    .insert({ naam: `Test ${label}`, slug })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data;
}

export async function maakLid(
  organisatieId: string,
  userId: string,
  rol: "beheerder" | "scheidsrechter" | "aanvoerder",
) {
  const { error } = await serviceClient()
    .from("organisatie_lid")
    .insert({ organisatie_id: organisatieId, user_id: userId, rol });
  if (error) throw error;
}

/** Verwijdert testorganisaties (cascade) en testgebruikers. */
export async function ruimOp(organisatieIds: string[], userIds: string[]) {
  const svc = serviceClient();
  for (const id of organisatieIds) {
    const { data } = await svc.from("organisatie").select("slug").eq("id", id).maybeSingle();
    if (data && !data.slug.startsWith("test-")) {
      throw new Error(`weiger op te ruimen: ${data.slug} is geen testorganisatie`);
    }
    const { error } = await svc.from("organisatie").delete().eq("id", id);
    if (error) throw error;
  }
  for (const id of userIds) {
    const { error } = await svc.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}

/** Insert via de service role en geef de rij terug. */
export async function voegToe<T extends Record<string, unknown>>(
  tabel: string,
  rij: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await serviceClient().from(tabel).insert(rij).select().single();
  if (error) throw new Error(`${tabel}: ${error.message}`);
  return data as T;
}

type Rij = { id: string } & Record<string, unknown>;

/** Volledige set testdata in één organisatie: van elke tenant-tabel minstens één rij. */
export async function vulOrganisatie(org: string) {
  const r = (tabel: string, rij: Record<string, unknown>) =>
    voegToe<Rij>(tabel, { organisatie_id: org, ...rij });

  const locatie = await r("locatie", { naam: "Sporthal", plaats: "Teststad" });
  const veld = await r("veld", { locatie_id: locatie.id, naam: "Veld 1", volgorde: 1 });
  const seizoen = await r("seizoen", { naam: "2026-27", status: "actief" });
  const speelmoment = await r("speelmoment", {
    seizoen_id: seizoen.id,
    weekdag: 6,
    starttijden: ["14:00"],
    velden: [veld.id],
  });
  const teamThuis = await r("team", { naam: "Thuisploeg" });
  const teamUit = await r("team", { naam: "Uitploeg" });
  const speler = await r("speler", { naam: "Jan", rugnummer: 9 });
  const verborgenSpeler = await r("speler", { naam: "Verborgen", verborgen: true });
  const selectie = await r("selectie", {
    seizoen_id: seizoen.id,
    team_id: teamThuis.id,
    speler_id: speler.id,
  });
  await r("selectie", {
    seizoen_id: seizoen.id,
    team_id: teamUit.id,
    speler_id: verborgenSpeler.id,
  });
  const onderdeel = await r("onderdeel", { seizoen_id: seizoen.id, naam: "Competitie", vorm: "competitie" });
  const fase = await r("fase", { onderdeel_id: onderdeel.id, type: "poule" });
  const poule = await r("poule", { fase_id: fase.id, naam: "Klasse A" });
  const inschrijving = await r("inschrijving", { poule_id: poule.id, team_id: teamThuis.id });
  await r("inschrijving", { poule_id: poule.id, team_id: teamUit.id });
  const koFase = await r("fase", { onderdeel_id: onderdeel.id, type: "knockout", volgorde: 1 });
  const bracket = await r("bracket", { fase_id: koFase.id, naam: "Beker", label_prefix: "B" });
  const doorstroomregel = await r("doorstroomregel", {
    van_fase_id: fase.id,
    positie_van: 1,
    positie_tot: 2,
    naar_bracket_id: bracket.id,
  });
  const wedstrijd = await r("wedstrijd", {
    fase_id: fase.id,
    poule_id: poule.id,
    veld_id: veld.id,
    datum: "2026-12-05",
    starttijd: "14:00",
    thuis_team_id: teamThuis.id,
    uit_team_id: teamUit.id,
  });
  const wedstrijdToken = await voegToe<Rij>("wedstrijd_token", {
    organisatie_id: org,
    wedstrijd_id: wedstrijd.id,
  });
  const wedstrijdEvent = await r("wedstrijd_event", {
    wedstrijd_id: wedstrijd.id,
    type: "doelpunt",
    team_id: teamThuis.id,
    speler_id: speler.id,
    minuut: 12,
  });
  const puntCorrectie = await r("punt_correctie", {
    inschrijving_id: inschrijving.id,
    punten: -3,
    reden: "Niet opgekomen",
  });
  const schorsing = await r("schorsing", { speler_id: speler.id, wedstrijden: 1, reden: "Rood" });
  const nieuws = await r("nieuws", { titel: "Nieuws: test", inhoud: "Hallo" });
  const historieEindstand = await r("historie_eindstand", {
    seizoen_naam: "2019-20",
    onderdeel_naam: "Competitie",
    positie: 1,
    team_naam: "Oude ploeg",
  });
  const historieTopscorer = await r("historie_topscorer", {
    seizoen_naam: "2019-20",
    speler_naam: "Oude spits",
    doelpunten: 20,
  });
  const historieBekerwinnaar = await r("historie_bekerwinnaar", {
    seizoen_naam: "2019-20",
    beker_naam: "Beker",
    winnaar_team_naam: "Oude ploeg",
  });

  return {
    locatie,
    veld,
    seizoen,
    speelmoment,
    team: teamThuis,
    teamUit,
    speler,
    verborgenSpeler,
    selectie,
    onderdeel,
    fase,
    koFase,
    poule,
    inschrijving,
    bracket,
    doorstroomregel,
    wedstrijd,
    wedstrijdToken,
    wedstrijdEvent,
    puntCorrectie,
    schorsing,
    nieuws,
    historieEindstand,
    historieTopscorer,
    historieBekerwinnaar,
  };
}
