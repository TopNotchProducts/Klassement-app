# Voortgang

## Fase 0 — infrastructuur
- [x] `.claude/settings.json` staat op de juiste plek (gecontroleerd 2026-11-20)
- [x] Stap 1 logins: Supabase CLI 3.2.0 ingelogd; Vercel ingelogd als `topnotchproducts`
- [x] Stap 2 projectlimiet: org "Top-Notch Products" (`ksahscqmdemfnvcqakhh`); na aanmaak 2/2 actief
  (wac-gemert, klassement-dev). Er is geen ruimte meer voor een derde actief project in deze org.
- [x] Stap 3 `klassement-dev` aangemaakt en gelinkt door Bart. Ref `vwvwjtlxjgycvxrhmvgn`,
  eu-central-1, ACTIVE_HEALTHY
- [x] Stap 4 `supabase init` (config.toml, migrations/); `.env*` en `supabase/.temp` in .gitignore
  - [x] `.env.local`: URL, ANON_KEY en SERVICE_ROLE_KEY gevuld; `tests/supabase-verbinding.test.ts`
    draait en slaagt (2026-11-20)
- [x] Scaffold Next.js 16.4.6 (TS, Tailwind 4, ESLint, App Router, geen src/), Vitest 5.1.1, CI
  (.github/workflows/ci.yml)
  - `@types/node` ^24 (dat is nodig voor de peer-dep van Vitest 5; Node 24 lokaal)
  - `tests/supabase-verbinding.test.ts` wordt overgeslagen zonder env-vars (bijv. in CI)
- [x] build/lint/test groen (2026-11-20)
- [x] git init, eerste commit `b8f2acc`
- [x] Vercel-project `top-notch-products-projects/klassement` aangemaakt + gelinkt
  (`.vercel/` is ignored). `vercel link` voegde `VERCEL_OIDC_TOKEN` toe aan `.env.local`.
- [x] GitHub-repo `TopNotchProducts/Klassement-app`, remote `origin` toegevoegd
- [x] Push gelukt (2026-11-20). gh 2.105.0 staat in `/usr/local/bin` (er is geen Homebrew), en
  Bart is ingelogd met de scope `workflow`. CI is groen.
- [x] CI-actions naar checkout@v7 / setup-node@v7 (de Node 20-deprecatie-annotatie)
- [x] Vercel aan GitHub gekoppeld (`vercel git connect`). **Let op:** elke push naar `main` deployt
  nu automatisch naar Vercel-productie.
- [x] Vercel env-vars (dev-waarden) door Bart, voor Production + Preview. SERVICE_ROLE_KEY als
  Secret, de twee NEXT_PUBLIC_* als Config.
- [x] Permissietest `git push --force --dry-run`: eerste poging mislukt (sessie gestart in `~`).
  Herhaald 2026-11-20 vanuit de projectmap: Bart kreeg de vraag. Geslaagd.
- [x] Keys opgehaald door Bart.
- [x] `vitest.config.ts` → `.mts` (de Vite-waarschuwing over de CJS-config is weg)
- [x] `.env.example` (wordt meegecommit) + README, commit `1340e19`
- [x] Deploy van de lege app + de verbinding geverifieerd (2026-11-20): `/api/health` op
  `klassement-d4vrmpsce-…vercel.app` geeft `{"ok":true,"supabase":"bereikbaar"}`.
  - Vercel maakte deze eerste deploy automatisch **production** (de eerste deploy van een
    project wordt altijd production), ook zonder `--prod`. Bart is geïnformeerd.
  - Deployment protection staat aan. Controleren gaat met `npx vercel curl … --deployment <url>`.
- [x] Afsluiting: build/lint/test groen en gepusht. Bart koos (2026-11-20): pushen naar `main` mag tot
  Fase 5 (vastgelegd in CLAUDE.md, chokepoint 3, en in docs/beslissingen.md).

**Fase 0 afgerond.** Volgende: Fase 1 (stamdata, fasemodel, `organisatie_lid` + `is_lid()`, RLS).

## Fase 1 — stamdata, fasemodel, RLS, triggers
- [x] Migraties geschreven (2026-11-20), syntax gecontroleerd met libpg-query:
  - `20261120120000_schema_stamdata_fasemodel.sql`: alle tabellen, samengestelde FK's
    (x_id, organisatie_id), zodat er geen verwijzingen tussen organisaties mogelijk zijn
  - `20261120120100_is_lid_en_rls.sql`: is_lid(), is_platform_beheerder(), RLS + policies
  - `20261120120200_triggers_score_audit.sql`: score, strafschoppen, bevestigen,
    scheidsrechtergrenzen, audit
- [x] Akkoord van Bart op de RLS en is_lid() (2026-11-20), inclusief de 3 afwijkingen
- [x] `on delete restrict` → `no action` (restrict brak het cascade-verwijderen van een organisatie)
- [x] `supabase db push` door Bart (2026-11-20): `npx supabase db push --remote=vwvwjtlxjgycvxrhmvgn`.
  Er werd geen wachtwoord gevraagd in zijn terminal. Met alleen `--remote` vindt CLI 3.2 de link niet;
  vanuit Claude Code bleef het commando hangen.
- [x] `@supabase/supabase-js` geïnstalleerd; `tests/helpers/supabase.ts`, `tests/isolatie.test.ts`
  (alle tenant-tabellen × rollen), `tests/triggers.test.ts` geschreven; tsc + lint schoon
- [x] Tests groen: 4 bestanden, 183 tests (2026-11-20). Na afloop geen `test-`-organisaties of
  testgebruikers over in klassement-dev.
- [x] CLAUDE.md + beslissingen.md bijgewerkt (wedstrijd_token, platform_beheerder,
  startdatum/einddatum, samengestelde FK's)
- [x] Afsluiting: build → lint → test → commit → push

**Fase 1 afgerond.** Volgende: Fase 2 (beheer: organisatie, seizoenswizard, locaties/velden/
speelmomenten, teams, spelers, CSV-import, huisstijl).

## Fase 2 — beheer
- [x] Auth: `@supabase/ssr`, `lib/supabase/{client,server,admin}.ts`, `proxy.ts` (getClaims),
  `/login` (magic link, geen self-signup), `/auth/callback` (PKCE), `/uitloggen`
- [x] Typed DB-client: `lib/supabase/database.types.ts` (`npm run types` na elke migratie)
- [x] `/platform`: organisatie aanmaken (slug-check, gereserveerde slugs) + beheerder toevoegen
- [x] `/[org]/beheer`: layout met huisstijlkleuren, tabs, overzicht met stappenlijst
- [x] Locaties en velden, Teams (bulk toevoegen), Seizoenen (wizard + detail + indelen),
  speelmomenten, Spelers (selectie per seizoen, overschrijven), CSV-import (controleren →
  importeren), Leden (rollen), Huisstijl (naam, kleuren, logo-upload)
- [x] Migraties `20261120150000_seizoenswizard.sql` (maak_seizoen, deel_klassen_in; security
  invoker, geen policy-wijziging) en `20261120150100_storage_logo.sql` (publieke bucket `logo`,
  upload alleen server-side met de service role)
- [x] Unit-tests csv/slug; `tests/seizoenswizard.test.ts` geschreven
- [x] Bart: db push (3 migraties, incl. `20261120160000_maak_seizoen_optionele_datums.sql`: datums
  optioneel; zonder default vond PostgREST de functie niet)
- [x] Bart: Supabase Auth → URL Configuration (localhost:3000 + *.vercel.app)
- [x] Bart is platformbeheerder in klassement-dev (`scripts/maak-platformbeheerder.mts`)
- [x] `/auth/confirm` (verifyOtp met token_hash), nodig voor Resend-template en voor de e2e-login
- [x] build/lint/test groen (7 bestanden, 195 tests)
- [x] E2E-doorloop via de UI (Playwright, scratchpad-script): platform maakt org + beheerder;
  beheerder zet locatie/velden, 6 teams, seizoen met 2 klassen + beker, indeling 3/3,
  speelmoment, spelers + CSV-import, huisstijl op. DB-controle klopt; daarna opgeruimd.
  Geen horizontaal scrollen op 360 px. Screenshots: `docs/screenshots/fase-2/`
- [ ] Klaar-criterium "zonder hulp": geautomatiseerd aangetoond; **Bart (en bij voorkeur
  iemand van het bestuur) loopt het zelf door** ← HIER

## Fase 3 — programma, ranglijsten, toernooien
- Fase 2 handmatige doorloop door Bart/bestuur: Bart koos om door te gaan naar Fase 3 (2026-11-20);
  blijft open als controle.
- [ ] **WAC-fixture van Bart**: `tests/fixtures/wac-beker-2026-27.csv` (wedstrijden) en
  `tests/fixtures/wac-bekerstand-2026-27.csv` (verwachte v_bekerstand) ← WACHT OP BART
- [x] `lib/regelset.ts` (zod; loting in regelset.loting, geen aparte tabel) en `lib/ranglijst.ts`
  (totaal/gemiddelde, tiebreakers incl. onderling-mini-stand, kaartpunten groen 1/geel 1/rood 3,
  correcties, waarschuwingen). WAC-controlegeval als unit-test groen.
- [x] `lib/roundrobin.ts` (cirkelmethode, heen/terug, planning over speelmomenten: 1× per avond,
  rondevolgorde) en `lib/knockout.ts` (seeding, byes, winnaar_naar). 20 tests groen.
- [ ] Migratie: status `concept`, winnaar-doorstroom-trigger, knockout bevestigen vereist winnaar
- [ ] UI: programma genereren/schuiven/publiceren, handmatige fase + CSV, standen, toernooisjablonen,
  bewerkbare boom, doorstroming bevestigen
