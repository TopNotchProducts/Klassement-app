# Beslissingen (decision log)

Kort: wat er besloten is, waarom, en wanneer. Het volledige plan staat in het Claude-project:
`claude/whitelabel-plan.md`.

| Datum | Beslissing | Waarom |
|---|---|---|
| 2026-11-19 | Een nieuwe repo, geen refactor van de WAC-app | Een schoon multi-tenant ontwerp. WAC stapt over op een vast moment. |
| 2026-11-19 | v1 alleen zaalvoetbal, met een sport-agnostisch model | De focus ligt op de eerste klanten. Een andere sport wordt later configuratie. |
| 2026-11-19 | Eén database met `organisatie_id` + RLS via een `organisatie_lid`-tabel (geen JWT-claim, geen project per klant) | Eenvoudiger, altijd actueel, meerdere organisaties per gebruiker, kosten gedeeld |
| 2026-11-19 | Twee vormen voor de beheerder (competitie/toernooi), onder de motorkap één fasemodel | Simpel voor de gebruiker, flexibel in de techniek |
| 2026-11-19 | Geen klasse-tegen-klasse lotingsgenerator; in plaats daarvan een handmatige fase met CSV-import | Een unieke WAC-constructie. Een handmatige fase dekt elke afwijkende opzet. |
| 2026-11-19 | Een totaalranglijst op gemiddelde per wedstrijd, doorstroming naar meerdere brackets en een bewerkbare boom zijn wél generiek | Nodig om WAC zonder WAC-code te kunnen draaien |
| 2026-11-19 | De score afgeleid van events (overgenomen uit WAC live scoring), met een handmatige uitzondering bij staking | Eén bron van waarheid. De beheerder bepaalt de uitslag bij een staking. |
| 2026-11-19 | Standaard tiebreakers: doelsaldo → onderling → doelpunten voor → loting | Gangbaar. De volgorde voor de WAC-competitie moet het bestuur nog bevestigen. |
| 2026-11-19 | Domein in het Nederlands | NL-markt, code uit WAC herbruikbaar |
| 2026-11-19 | Een korte CLAUDE.md (< ~300 regels), het waarom hier | De WAC-CLAUDE.md (846 regels) was te lang, zie playbook Part 3 |
| 2026-11-19 | Permissies in `.claude/settings.json`; force-push-varianten expliciet op ask | In WAC stond de config in de root (niet gelezen) en liet `git push *` ook force-push toe |
| 2026-11-20 | Merknaam **Klassement**, met de ondertitel "competitiebeheer voor clubs" | Een sportwoord dat in elke sport werkt. Spelers zien de naam wekelijks, wat mond-tot-mondreclame oplevert. Als merk is het beschrijvend, dus het krijgt een eigen logo. |
| 2026-11-20 | Geen Docker of lokale Supabase. Tot Fase 5 alleen het gehoste `klassement-dev` (eu-central-1); in Fase 5 een schoon `klassement-prod` erbij, en dev wordt staging. | Er zijn nog geen gebruikers, dus dat is eenvoudiger. Productie start zonder testdata. Echte data betekent: productie-regels. |
| 2026-11-20 | Mail: tot Fase 4 de standaard-SMTP van Supabase (alleen Bart); vanaf Fase 4 Resend met een eigen domein (free: 100 per dag, 3.000 per maand) | De standaard-SMTP mailt alleen naar teamleden, 2 per uur. Het domein kan daardoor tot Fase 4 wachten. |
| 2026-11-19 | Logins en tokens doet Bart zelf in de terminal, nooit via de chat | Beveiliging; Claude Code werkt met de bestaande CLI-sessies |
