# CLAUDE.md — Klassement (white-label competitiebeheer)

## Project
Multi-tenant webapp waarmee organisatoren van recreatieve zaalvoetbalcompetities zelfstandig
een seizoen opzetten en draaien. Dat omvat klassen, teams, spelers, programma, toernooien/bekers,
scheidsrechtersinvoer, standen en topscorers, onder hun eigen naam en logo.
Eerste klant (tenant #1): WAC Gemert, dat overstapt vanaf de bestaande WAC-app
(`~/AI Projecten/WAC-app`, alleen-lezen referentie).

**Kernbelofte:** het bestuur doet alles zelf. Elke feature wordt getoetst aan de vraag of een
niet-technische vrijwilliger dit zonder hulp van de platformbeheerder kan.

Het *waarom* achter beslissingen staat in `docs/beslissingen.md`. Dit bestand bevat alleen het
*wat* en de *regels*. Houd het onder ~300 regels.

---

## Part 1 — Werkprincipes

1. **Verifieer vóór je concludeert.** Trek nooit conclusies over de bestands-, git-, build- of
   databasestatus zonder een check (`ls`, `git status`, `git log`, `npm run build`, query).
   Kies de eenvoudigste oplossing die geverifieerd werkt.
2. **Context-resilience.** Werk `_progress.md` bij na elke betekenisvolle stap. Elke fase heeft
   idempotentie-instructies: als iets al bestaat of al gedaan is, sla het over en ga verder bij
   de volgende stap.
3. **Gefaseerd.** Werk de fases in volgorde af (zie Fasering). Commit elke fase vóór de
   volgende begint. Bouw nooit iets op onderdelen die nog niet bestaan.
4. **Afsluiting per fase:** pas als alles af en geverifieerd is:
   `npm run build` → `npm run lint` → `npm test` (alle drie groen, eerst fouten fixen) →
   `git add .` → `git commit -m "<beschrijving>"` → `git push`.
5. **Chokepoints:** zie Part 2. Doe die nooit autonoom.
6. **Naming** ligt vast (zie Conventies). Steekproef na elke bulkgeneratie.
7. **Dit bestand is de bron van waarheid.** Wijzigt een conventie, dan werk je dit bestand in
   dezelfde commit bij. Een verouderde CLAUDE.md is een bug.
8. **Migraties eerst op een kopie.** Tot Fase 5 is er alleen `klassement-dev` zonder echte
   gebruikers, en daar mag je migraties direct op toepassen. Vanaf Fase 5 (productie met echte
   data) gaat elke migratie eerst naar dev, met realistische data. Vergelijk tellingen en
   standen vóór en na en leg dat vast in `_progress.md`. Op productie past alleen Bart
   migraties toe.
9. **Feedbackmomenten.** Lever bij UI-werk screenshots op 360 px (portret) en desktop, en wacht
   bij de chokepoint-UX-items op akkoord.

---

## Part 2 — Projectspecifiek

### Stack & hosting
- Next.js 16 (App Router, TypeScript, Tailwind 4). Routing per organisatie via `/[org]/…`.
  De request-hook heet in Next 16 `proxy.ts` (voorheen middleware).
- Supabase: Postgres, Auth (magic link), RLS, Storage. Er is geen Docker of lokale Supabase
  nodig. **Fase 0–4:** één gehost project `klassement-dev`, regio `eu-central-1` (Frankfurt,
  i.v.m. AVG), dat dient als ontwikkel- en testomgeving. **Fase 5:** er komt een schoon,
  nieuw project `klassement-prod` bij (dan op Pro, met de WAC-import), en `klassement-dev`
  wordt staging. Zo komt er nooit testdata in productie.
- **Harde regel:** zodra een omgeving echte gebruikersdata bevat, is die omgeving productie.
  Dan gelden alle productie-chokepoints, ook als er nog geen staging naast staat.
- Mail: tot Fase 4 de standaard-SMTP van Supabase. Die mailt alleen naar teamleden (2 per
  uur), en Bart is het enige teamlid. Vanaf Fase 4 **Resend** als custom SMTP, met een eigen
  domein. Het gratis plan geeft 100 mails per dag en 3.000 per maand.
- Vercel (Pro, vanwege commercieel gebruik). GitHub-repo van Bart.
- Controleer vóór het gebruik van een library-API de actuele documentatie.

### Deploy & omgeving
- Commando's: `npm run build`, `npm run lint`, `npm test` (Vitest). Groen betekent exit 0
  zonder warnings die je zelf hebt geïntroduceerd.
- Env-vars (namen, niet de waarden): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- De service role key alleen in server actions en scripts, nooit in client-code of in
  `NEXT_PUBLIC_*`.
- Tot Fase 5 werk je tegen `klassement-dev`. Vanaf Fase 5 werk je standaard tegen dev en
  gaat productie alleen via een chokepoint.
- Tests (Vitest) draaien tegen dev, met eigen testorganisaties (slug-prefix `test-`). Ze
  ruimen hun eigen data op en raken nooit andere organisaties.
- Na elke migratie: `npm run types` (genereert `lib/supabase/database.types.ts`).
- Elke beheer-server-action begint met `beheerActie()`/`vereisBeheerder()` (een action is een
  publiek endpoint). De service role alleen ná die check (accounts, logo-upload).

### Repo
- Single repo, werken op `main`, kleine commits, commitberichten in het Nederlands.

### Gevoelig — guardrails
- Persoonsgegevens van spelers, mogelijk minderjarigen, en teamfoto's.
- **Grootste risico: een datalek tussen organisaties.**
- Elke nieuwe tenant-tabel krijgt in **dezelfde commit**:
  - `organisatie_id not null`;
  - RLS aan, met policies via `is_lid()`;
  - een isolatietest;
  - verwijzingen naar andere tenant-tabellen via een samengestelde FK
    `(x_id, organisatie_id) → x(id, organisatie_id)`.
- Geen geboortedatum. Een foto alleen tonen met de toestemmingsvlag.
- Datum en tijd altijd in `Europe/Amsterdam` (de server draait in UTC).

### Chokepoints — NOOIT autonoom
1. Migraties of scripts tegen **productie** (`supabase db push`, import, service-role-scripts).
   Bart voert die zelf uit.
2. Wijzigingen aan RLS-policies of `is_lid()`. Toon de diff en wacht op akkoord.
3. Productiedeploy, force-push, `rm -rf`, `supabase db reset`. **Uitzondering tot Fase 5:** een
   push naar `main` (die Vercel automatisch naar productie deployt) mag, want er zijn nog geen
   echte gebruikers en de app gebruikt alleen `klassement-dev`. Vanaf Fase 5 vervalt dit.
4. Het WAC-importscript en de controle na parallel draaien.
5. **UX-akkoord** van Bart (en bij voorkeur iemand van het bestuur) op de scheidsrechtersflow
   en de toernooiconfiguratie, op basis van screenshots.
6. Teksten richting klanten: privacyverklaring, verwerkersovereenkomst, prijzen.

### Permissies (`.claude/settings.json`)
- `defaultMode: acceptEdits`, nooit `bypassPermissions`.
- **Vooraf toegestaan:** npm install/build/lint/dev/test, `npx supabase` (lokaal), git
  status/diff/log/add/commit/push, mkdir/touch.
- **Bewust op ask:**
  - alle force-push-varianten
  - `rm -rf`
  - `supabase db push`, `supabase db reset`
  - `vercel` deploys
- Regels gaan in de volgorde deny → ask → allow, en de lijsten uit alle settings-bestanden
  worden samengevoegd. Een allow in `settings.local.json` overschrijft dus nooit een ask hier.

### Conventies
- **Taal:** het domein in het Nederlands (tabellen, kolommen, routes, UI). Code-identifiers
  mogen Engels zijn waar dat idiomatisch is (React, hooks).
- **Tabellen** enkelvoud snake_case. Primary key `id uuid default gen_random_uuid()`, foreign
  keys `<tabel>_id`, tenant-tabellen `organisatie_id`.
- **Organisatie-slug:** kebab-case, uniek, onveranderlijk na aanmaak. Het is het eerste
  padsegment.
- **Migraties:** `supabase/migrations/YYYYMMDDHHMMSS_beschrijving.sql`. Wijzig nooit een
  gedraaide migratie; voeg altijd een nieuwe toe.
- **Enums/types:** lowercase snake_case in de database. De weergavetekst komt uit het
  sportprofiel.

---

## Functionele specificatie

### Rollen
| Rol | Toegang |
|---|---|
| `platform_beheerder` (Bart) | Organisaties aanmaken, support, alles inzien (tabel `platform_beheerder`; telt in `is_lid()` als lid van elke organisatie) |
| `beheerder` (bestuur) | Alles binnen de eigen organisatie |
| `scheidsrechter` | Token-link per wedstrijd **of** inloggen en dan alle wedstrijden van de organisatie zien. Uitslag invoeren en altijd achteraf kunnen aanpassen. Geen vaste toewijzing. |
| `aanvoerder` | Spelerslijst vooraf, optioneel per organisatie. Blokkeert nooit een wedstrijd. |
| Publiek | Lezen, zonder login |

Leden staan in `organisatie_lid (user_id, organisatie_id, rol)`. Een gebruiker kan lid zijn
van meerdere organisaties.

### Datamodel — stamdata
- `organisatie` (naam, slug, logo_url, kleuren, sportprofiel, instellingen jsonb)
- `organisatie_lid`
- `locatie` (naam, plaats) → `veld` (locatie, naam, volgorde)
- `speelmoment` (seizoen, weekdag/datum, starttijden[], velden[]): instelbaar door de beheerder
- `team`: stabiele identiteit met een muteerbare naam. **Geen klasse-veld.**
- `speler` (naam, rugnummer, verborgen, foto_toestemming). **Geen geboortedatum.**
- `seizoen` (naam, startdatum, einddatum, status: concept/actief/afgesloten). Conceptseizoenen
  zijn voorlopig publiek leesbaar; publiceren volgt in Fase 3.

### Datamodel — fasemodel
- `onderdeel` (seizoen, naam, vorm: `competitie` | `toernooi`, volgorde)
- `fase` (onderdeel, volgorde, type: `poule` | `handmatig` | `knockout`, regelset jsonb,
  ranglijst: `per_poule` | `totaal`)
- `poule` (fase, naam, volgorde). Een competitie heeft één poule per klasse.
- `inschrijving` (poule, team). Dit vervangt WAC's `team_seizoen_klasse`.
- `selectie` (seizoen, team, speler)
- `doorstroomregel` (van_fase, positie_van, positie_tot, naar_bracket of naar_poule)
- `bracket` (fase, naam, label_prefix)
- `wedstrijd` (organisatie, fase, poule|bracket, ronde, slot, veld, datum, starttijd,
  thuis_team, uit_team (beide nullable bij een knockout-placeholder), status, label,
  winnaar_naar_wedstrijd_id, winnaar_naar_slot). Het scheidsrechterstoken staat in
  `wedstrijd_token` (alleen voor de beheerder), omdat `wedstrijd` publiek leesbaar is.
- **Status:** `gepland` → `bezig` → `bevestigd`, of `afgelast` | `uitgesteld` | `gestaakt`.
- `wedstrijd_event` (wedstrijd, type, team, speler nullable, minuut nullable). Types in v1:
  `doelpunt`, `eigen_doelpunt`, `doelpunt_onbekend`, `geel`, `groen`, `rood`.
- `wedstrijd_uitslag` (wedstrijd, score_thuis, score_uit, handmatig bool, reden,
  winnaar_na_strafschoppen_team_id)
- `punt_correctie` (inschrijving, punten, reden)
- `schorsing` (speler, wedstrijden of periode, reden). Alleen registratie.
- `audit_log` (tabel, record_id, oud jsonb, nieuw jsonb, door, op)
- `nieuws` (titel "Label: naam"-conventie, datum, inhoud)
- `historie_eindstand`, `historie_topscorer`, `historie_bekerwinnaar`: statische archiefrecords
  van vóór de app

### Regels voor uitslagen
- De score wordt **afgeleid uit de doelpunt-events** via een trigger. Directe overschrijving
  wordt genegeerd. **Uitzondering:** `handmatig = true` (staking/reglementair), dat de
  beheerder invult met een reden.
- Bevestigen kan niet zolang er een `doelpunt_onbekend` staat.
- `winnaar_na_strafschoppen` mag alleen bij een knockout en een gelijke stand, en moet een van
  de twee teams zijn. De trigger leegt het veld als de stand geen gelijkspel meer is.
- Standen, ranglijsten en topscorers tellen alleen `bevestigd` en worden nooit opgeslagen.

### Regelset per fase (jsonb, gevalideerd met zod)
- `punten`: {winst, gelijk, verlies}, standaard 3/1/0
- `keer_tegen_elkaar` (poule)
- `rangschikking`: `totaal` | `gemiddelde`. Waarschuw als teams ongelijk veel spelen en er
  `totaal` is gekozen.
- `tiebreakers`: een geordende lijst uit:
  - `doelsaldo`
  - `onderling` (mini-stand van de gelijke teams; blijven ze gelijk, dan de volgende
    tiebreaker)
  - `doelpunten_voor`
  - `meeste_gespeeld`
  - `minste_kaarten`
  - `loting` (handmatig vastgelegd door de beheerder)
- **Standaard tiebreakers:** `doelsaldo`, `onderling`, `doelpunten_voor`, `loting`.
- `wedstrijdduur`, `wedstrijdduur_finale` (informatief en voor de planning)
- Knockout: `bij_gelijk`: `strafschoppen`.

### Toernooisjablonen (wat de beheerder kiest)
1. Alleen knockout
2. Poules → knockout
3. Poules → meerdere knockouts (A/B)
4. Handmatige wedstrijden → totaalranglijst → meerdere knockouts

- **Knockout:**
  - Standaard seeding: 1–16, 8–9, 5–12, 4–13, 2–15, 7–10, 6–11, 3–14 (en het equivalent voor
    andere groottes, met byes als het aantal geen macht van 2 is).
  - De boom is gegenereerd, maar **bewerkbaar**.
  - Winnaars stromen automatisch door naar `winnaar_naar_*`.
- Een **losse wedstrijd** (bijvoorbeeld de Supercup) valt buiten elke ranglijst.

### Functionaliteit v1
- **Beheer:**
  - **Seizoenswizard:** kopieer teams en spelers → klassen indelen → onderdelen kiezen.
  - Locaties, velden en speelmomenten instellen.
  - Spelers: CRUD, overschrijven, CSV-import, uitnodigingslink voor de aanvoerder.
  - **Round-robin-generator** voor poules, met verdeling over speelmomenten en velden →
    concept → handmatig schuiven → publiceren.
  - **Handmatige fase:** snel invoerscherm en CSV-import, met waarschuwingen (geen blokkades)
    bij dubbele tegenstanders of ongelijke aantallen.
  - Toernooi draaien: doorstroming bevestigen → knockout genereren.
  - **Wedstrijdbeheer:** afgelasten, uitstellen, staken (handmatige uitslag), corrigeren,
    puntenaftrek, schorsing.
  - Nieuws, historie-import, huisstijl (logo en twee kleuren), CSV-export van alle data.
- **Scheidsrechter:** live invoer, grote tikvlakken, een eigen weergave zonder navigatie,
  standaard de wedstrijden van vandaag. Klaar in minder dan 2 minuten.
- **Publiek:**
  - programma en uitslagen per veld;
  - standen met de tiebreakers in gewone taal;
  - topscorers;
  - toernooipagina's: ranglijst en brackets, met placeholders voor toekomstige rondes;
  - teams met foto, nieuws, historie.
  - Mobile-first, zonder login.

### Expliciet buiten scope v1
Digitale spelersaanmelding en spelerspas (v2, hoge prioriteit) · loting-hulp en potindeling ·
dubbele knockout · embed-widget · subdomeinen en eigen domeinen · andere sporten ·
self-signup en betalingen · automatische schorsingen · dashboards en grafieken · notificaties ·
offline-invoer · eendaagse eventfeatures.

---

## § Dingen die nooit mogen driften
- Elke tenant-tabel heeft `organisatie_id` en RLS via `is_lid()`, met een isolatietest. Een
  gebruiker van organisatie A kan nooit data van B lezen of schrijven.
- Standen, ranglijsten en topscorers zijn **altijd afgeleid**. De enige uitzondering zijn de
  `historie_*`-archieftabellen, en alleen voor seizoenen van vóór de app.
- De score is afgeleid van events, behalve bij `handmatig = true` met een reden.
- Elke wijziging aan een uitslag of een event komt in `audit_log`.
- Een team heeft **nooit** een klasse-veld; de klasse loopt via `inschrijving`.
- Er wordt nooit een geboortedatum opgeslagen.
- Er is geen WAC-specifieke code of constante. WAC is configuratie (data), geen code.
- De service role key nooit client-side.

---

## Fasering
Begin elke fase met het lezen van `_progress.md` (idempotentie: wat al af is, sla je over).

| Fase | Inhoud | Klaar als… |
|---|---|---|
| 0 | **Eerste stap:** Bart verplaatst `docs/claude-settings.json` naar `.claude/settings.json` (dat bestand kon niet op afstand worden aangemaakt; een `settings.json` in de root wordt niet gelezen). Daarna scaffold, Vitest, de infrastructuur (zie "Fase 0 — infrastructuur") en CI (build/lint/test) | Een lege app deployt naar Vercel en is gekoppeld aan `klassement-dev`. **Permissietest:** `git push --force --dry-run` triggert een vraag. |
| 1 | Stamdata, fasemodel, `organisatie_lid` + `is_lid()`, RLS, audit-triggers, score-triggers | Isolatietests groen met 2 testorganisaties en alle rollen. Score- en strafschoppen-triggers getest. |
| 2 | Beheer: organisatie (platformbeheerder), seizoenswizard, locaties/velden/speelmomenten, teams, spelers, CSV-import, huisstijl | Een testorganisatie zet zonder hulp een competitie met 2 klassen op |
| 3 | Round-robin-generator, handmatige fase met import, ranglijsten en tiebreakers, toernooisjablonen, knockout met bewerkbare boom | **WAC-regressietest groen** (zie hieronder). Daarna stop je voor de demo aan externe organisatoren. |
| 4 | Scheidsrechter (token en login, live), aanvoerder, alle publieke pagina's | Een wedstrijd invoeren werkt de stand en de bracket direct correct bij. UX-akkoord van Bart. |
| 5 | WAC-importscript, parallel draaien | Chokepoint. Standen, bekerstand en topscorers zijn exact gelijk aan de oude app. |
| 6 | Eerste externe klant onboarden | De klant draait zelfstandig |

**WAC-regressietest (Fase 3):**
- Bart levert een export van de WAC-beker-groepswedstrijden 2026-27 aan als fixture
  (`tests/fixtures/wac-beker-2026-27.csv`).
- Configuratie:
  - een handmatige fase met een totaalranglijst op `gemiddelde`;
  - tiebreakers: `meeste_gespeeld`, `doelsaldo` (gemiddeld), `doelpunten_voor` (gemiddeld),
    `loting`.
- **De ranglijst moet exact gelijk zijn aan de WAC-`v_bekerstand`.** Controlegeval: Leenders
  Tegelzetters (3 gespeeld) staat boven Auto Mundi/@Harmse (2 gespeeld).
- Doorstroming: 1–16 → Grote beker, 17–32 → Kleine beker, 33–35 vallen af.

### Fase 0 — infrastructuur opzetten (Claude Code doet het werk, Bart klikt waar nodig)
Controleer bij elke stap eerst wat al bestaat (idempotent). Verifieer de CLI-syntax met
`--help` of in de actuele docs voordat je iets uitvoert.
1. **Logins controleren (eerste actie van Fase 0).** Check `npx supabase projects list` en
   `npx vercel whoami`. Als een van beide faalt omdat Bart niet is ingelogd, **stop je**. Vraag
   Bart dan om zelf `npx supabase login` en/of `npx vercel login` uit te voeren, in een eigen
   terminalvenster in deze map. Beide openen een browser om in te loggen. Voer de logins nooit
   zelf uit en vraag nooit om tokens of wachtwoorden in de chat. Ga pas verder als beide checks
   slagen.
2. Check met `npx supabase projects list` hoeveel actieve projecten er al zijn. Het gratis plan
   staat er maar 2 toe. Als er al 2 zijn, stop je en vraag je Bart wat er moet gebeuren
   (een project pauzeren, of upgraden).
3. **Ontwikkelproject: dat maakt Bart zelf aan in het Supabase-dashboard** (chokepoint, i.v.m.
   het wachtwoord):
   - New project, naam `klassement-dev`, regio Central EU (Frankfurt).
   - Het databasewachtwoord via "Generate a password", direct opslaan in de
     wachtwoordmanager.
   - Daarna geeft Bart alleen de **project-ref** door (uit de URL of Project Settings). Dat is
     niet geheim.
   - Daarna voert Bart zelf, in zijn eigen terminal, `npx supabase link --project-ref <ref>`
     uit en vult daar het wachtwoord in als erom gevraagd wordt.
   - Het wachtwoord komt nooit in de chat, in bestanden of in commando-argumenten (die
     belanden in de shellgeschiedenis).
   - Vraagt een latere stap (zoals `db push`) opnieuw om het wachtwoord, dan stop je en laat je
     Bart het commando zelf uitvoeren.
4. `npx supabase init` (alleen de mapstructuur en migraties, geen `start`). Daarna een
   `.env.local` met de keys van `klassement-dev`, die Bart in de terminal invult. Controleer dat
   `.env*` in `.gitignore` staat. Let op: een gratis project pauzeert na een week inactiviteit.
   Herstellen kan in het dashboard.
5. Vercel: maak het project aan en koppel het (`npx vercel link`). Daarna de env-vars (van dev,
   tot Fase 5) via `npx vercel env add`. Bart levert de waarden aan in de terminal, niet in de
   chat.
6. **Upgraden naar Vercel Pro en Supabase Pro doet Bart zelf in het dashboard**, vlak voor de
   eerste betalende klant. Tot die tijd blijft alles gratis.
7. **Mail en domein: niet in Fase 0, wel vóór Fase 4** (zodra anderen dan Bart moeten
   inloggen). Tot die tijd volstaat de standaard-SMTP van Supabase, omdat Bart het enige
   teamlid is. App-URL tot dan: `*.vercel.app`. Daarna registreert Bart het domein (Klassement,
   bijvoorbeeld `klassement.app` of `mijnklassement.nl`), maakt een Resend-account aan en voegt
   het domein toe. Claude Code geeft de exacte
   DNS-records (SPF/DKIM) die bij de registrar moeten. Daarna stel je in Supabase onder
   Auth → SMTP de Resend-gegevens in, test je een magic link naar een niet-teamlid, en zet je
   de rate limit op een passend niveau.
