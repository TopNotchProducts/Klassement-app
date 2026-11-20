# Voortgang

## Fase 0 — infrastructuur
- [x] `.claude/settings.json` staat op de juiste plek (gecontroleerd 2026-11-20)
- [ ] Stap 1 logins
  - [x] Supabase CLI ingelogd (CLI 3.2.0)
  - [ ] Vercel: **niet ingelogd**. Bart moet `npx vercel login` zelf draaien. ← HIER GEBLEVEN
- [ ] Stap 2 projectlimiet. Voorlopige stand (2026-11-20):
  - org "Top-Notch Products": 1 actief (wac-gemert), 2 gepauzeerd (Barbie booth, EasyReps)
  - org "Novapix": 0 actief, 1 gepauzeerd (Novapix)
  - Besluit Bart (2026-11-20): `klassement-dev` komt in org "Top-Notch Products"
    (`ksahscqmdemfnvcqakhh`). Er is plek: 1 van de 2 actief.
  - Stap 3 voert Bart zelf uit, vanwege het db-wachtwoord (de CLI vraagt er interactief om).
- [ ] Stap 3 klassement-dev aanmaken + link
- [ ] Stap 4 supabase init, .env.local, .gitignore
- [ ] Stap 5 Vercel project + env-vars
- [ ] Scaffold Next.js 16, Vitest, CI
- [ ] Permissietest `git push --force --dry-run`
- [ ] Afsluiting: build → lint → test → commit → push
