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
- [ ] Vercel aan GitHub koppelen ← HIER
- [ ] Vercel env-vars (dev-waarden) via `npx vercel env add`, door Bart
- [x] Permissietest `git push --force --dry-run`: eerste poging mislukt (sessie gestart in `~`).
  Herhaald 2026-11-20 vanuit de projectmap: Bart kreeg de vraag. Geslaagd.
- [x] Keys opgehaald door Bart.
- [x] `vitest.config.ts` → `.mts` (de Vite-waarschuwing over de CJS-config is weg)
- [x] `.env.example` (wordt meegecommit) + README, commit `1340e19`
- [ ] Deploy van de lege app + verbinding met klassement-dev verifiëren
- [ ] Afsluiting: build → lint → test → commit → push
