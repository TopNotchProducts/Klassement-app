# Voortgang

## Fase 0 — infrastructuur
- [x] `.claude/settings.json` staat op de juiste plek (gecontroleerd 2026-11-20)
- [x] Stap 1 logins: Supabase CLI 3.2.0 ingelogd; Vercel ingelogd als `topnotchproducts`
- [x] Stap 2 projectlimiet: org "Top-Notch Products" (`ksahscqmdemfnvcqakhh`); na aanmaak 2/2 actief
  (wac-gemert, klassement-dev). Er is geen ruimte meer voor een derde actief project in deze org.
- [x] Stap 3 `klassement-dev` aangemaakt en gelinkt door Bart. Ref `vwvwjtlxjgycvxrhmvgn`,
  eu-central-1, ACTIVE_HEALTHY
- [x] Stap 4 `supabase init` (config.toml, migrations/); `.env*` en `supabase/.temp` in .gitignore
  - [ ] `.env.local`: de URL staat erin. **Bart vult ANON_KEY en SERVICE_ROLE_KEY in.** ← HIER
- [x] Scaffold Next.js 16.4.6 (TS, Tailwind 4, ESLint, App Router, geen src/), Vitest 5.1.1, CI
  (.github/workflows/ci.yml)
  - `@types/node` ^24 (dat is nodig voor de peer-dep van Vitest 5; Node 24 lokaal)
  - `tests/supabase-verbinding.test.ts` wordt overgeslagen zonder env-vars (bijv. in CI)
- [x] build/lint/test groen (2026-11-20)
- [x] git init, eerste commit `b8f2acc`
- [x] Vercel-project `top-notch-products-projects/klassement` aangemaakt + gelinkt
  (`.vercel/` is ignored). `vercel link` voegde `VERCEL_OIDC_TOKEN` toe aan `.env.local`.
- [ ] GitHub-repo (gh CLI niet geïnstalleerd) → remote toevoegen → push → Vercel aan GitHub koppelen
- [ ] Vercel env-vars (dev-waarden) via `npx vercel env add`, door Bart
- [ ] Permissietest `git push --force --dry-run`: uitgevoerd. Bart moet bevestigen dat er een
  vraag kwam. (Er was geen remote, dus git faalde daarna sowieso.)
- [ ] Deploy van de lege app + verbinding met klassement-dev verifiëren
- [ ] Afsluiting: build → lint → test → commit → push
