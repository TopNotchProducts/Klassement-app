-- ============================================================================
-- Fase 1 — is_lid() en RLS.  ⚠ CHOKEPOINT: wijzigingen hieraan alleen met
-- akkoord van Bart (CLAUDE.md, chokepoint 2).
--
-- Toegangsmodel
-- * Publiek (anon) leest wat op de publieke pagina's staat: organisatie,
--   stamdata, fasemodel, wedstrijden, uitslagen, events, nieuws, historie,
--   en spelers die niet verborgen zijn.
-- * Alleen leden lezen: schorsingen en verborgen spelers.
-- * Alleen beheerders lezen: audit_log, wedstrijd_token, de ledenlijst
--   (een lid ziet wel zijn eigen lidmaatschap).
-- * Schrijven: beheerder binnen de eigen organisatie. De scheidsrechter
--   schrijft events en uitslagen en mag de status van een wedstrijd wijzigen
--   (de triggers in de volgende migratie beperken wát hij mag).
-- * De platformbeheerder telt in is_lid() als lid (met elke rol) van elke
--   organisatie: "alles inzien" en support.
-- * De aanvoerder heeft in Fase 1 alleen leesrechten als lid; schrijfrechten
--   volgen in Fase 4.
-- ============================================================================

create function public.is_platform_beheerder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_beheerder where user_id = (select auth.uid())
  );
$$;

-- Is de ingelogde gebruiker lid van de organisatie (met een van de rollen, als
-- die zijn opgegeven)? security definer: leest organisatie_lid zonder dat de
-- RLS op die tabel zichzelf aanroept.
create function public.is_lid(
  p_organisatie_id uuid,
  p_rollen public.lid_rol[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_platform_beheerder() or exists (
    select 1
    from public.organisatie_lid l
    where l.organisatie_id = p_organisatie_id
      and l.user_id = (select auth.uid())
      and (p_rollen is null or l.rol = any (p_rollen))
  );
$$;

-- Rechten op tabelniveau; RLS bepaalt daarbinnen welke rijen.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- RLS aan op ALLE tabellen in public ----------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'organisatie', 'platform_beheerder', 'organisatie_lid',
    'locatie', 'veld', 'seizoen', 'speelmoment', 'team', 'speler',
    'onderdeel', 'fase', 'poule', 'inschrijving', 'selectie', 'bracket',
    'doorstroomregel', 'wedstrijd', 'wedstrijd_token', 'wedstrijd_event',
    'wedstrijd_uitslag', 'punt_correctie', 'schorsing', 'audit_log', 'nieuws',
    'historie_eindstand', 'historie_topscorer', 'historie_bekerwinnaar'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Organisatie ----------------------------------------------------------------

create policy organisatie_select on public.organisatie
  for select to anon, authenticated using (true);
create policy organisatie_insert on public.organisatie
  for insert to authenticated with check ((select public.is_platform_beheerder()));
create policy organisatie_update on public.organisatie
  for update to authenticated
  using (public.is_lid(id, '{beheerder}'))
  with check (public.is_lid(id, '{beheerder}'));
create policy organisatie_delete on public.organisatie
  for delete to authenticated using ((select public.is_platform_beheerder()));

-- Platformbeheerder: alleen je eigen rij zien; schrijven alleen via service role.
create policy platform_beheerder_select on public.platform_beheerder
  for select to authenticated using (user_id = (select auth.uid()));

-- Organisatie_lid ------------------------------------------------------------

create policy organisatie_lid_select on public.organisatie_lid
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_lid(organisatie_id, '{beheerder}'));
create policy organisatie_lid_insert on public.organisatie_lid
  for insert to authenticated with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy organisatie_lid_update on public.organisatie_lid
  for update to authenticated
  using (public.is_lid(organisatie_id, '{beheerder}'))
  with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy organisatie_lid_delete on public.organisatie_lid
  for delete to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));

-- Standaardpatroon: publiek lezen, beheerder schrijft -------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'locatie', 'veld', 'seizoen', 'speelmoment', 'team', 'onderdeel', 'fase',
    'poule', 'inschrijving', 'selectie', 'bracket', 'doorstroomregel',
    'punt_correctie', 'nieuws',
    'historie_eindstand', 'historie_topscorer', 'historie_bekerwinnaar'
  ]
  loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated
         with check (public.is_lid(organisatie_id, ''{beheerder}''))', t);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated
         using (public.is_lid(organisatie_id, ''{beheerder}''))
         with check (public.is_lid(organisatie_id, ''{beheerder}''))', t);
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated
         using (public.is_lid(organisatie_id, ''{beheerder}''))', t);
  end loop;
end;
$$;

-- Speler: verborgen spelers alleen voor leden --------------------------------

create policy speler_select on public.speler
  for select to anon, authenticated
  using (not verborgen or public.is_lid(organisatie_id));
create policy speler_insert on public.speler
  for insert to authenticated with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy speler_update on public.speler
  for update to authenticated
  using (public.is_lid(organisatie_id, '{beheerder}'))
  with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy speler_delete on public.speler
  for delete to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));

-- Wedstrijd: beheerder alles; scheidsrechter alleen bijwerken (status) -------

create policy wedstrijd_select on public.wedstrijd
  for select to anon, authenticated using (true);
create policy wedstrijd_insert on public.wedstrijd
  for insert to authenticated with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy wedstrijd_update on public.wedstrijd
  for update to authenticated
  using (public.is_lid(organisatie_id, '{beheerder,scheidsrechter}'))
  with check (public.is_lid(organisatie_id, '{beheerder,scheidsrechter}'));
create policy wedstrijd_delete on public.wedstrijd
  for delete to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));

-- Events en uitslagen: beheerder en scheidsrechter ---------------------------

do $$
declare
  t text;
begin
  foreach t in array array['wedstrijd_event', 'wedstrijd_uitslag']
  loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated
         with check (public.is_lid(organisatie_id, ''{beheerder,scheidsrechter}''))', t);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated
         using (public.is_lid(organisatie_id, ''{beheerder,scheidsrechter}''))
         with check (public.is_lid(organisatie_id, ''{beheerder,scheidsrechter}''))', t);
  end loop;
end;
$$;

-- Een event verwijderen mag de scheidsrechter (correctie); een uitslag-rij
-- verwijderen alleen de beheerder (anders omzeilt hij de handmatige uitslag).
create policy wedstrijd_event_delete on public.wedstrijd_event
  for delete to authenticated
  using (public.is_lid(organisatie_id, '{beheerder,scheidsrechter}'));
create policy wedstrijd_uitslag_delete on public.wedstrijd_uitslag
  for delete to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));

-- Scheidsrechterstoken: alleen beheerder --------------------------------------

create policy wedstrijd_token_select on public.wedstrijd_token
  for select to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));
create policy wedstrijd_token_insert on public.wedstrijd_token
  for insert to authenticated with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy wedstrijd_token_update on public.wedstrijd_token
  for update to authenticated
  using (public.is_lid(organisatie_id, '{beheerder}'))
  with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy wedstrijd_token_delete on public.wedstrijd_token
  for delete to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));

-- Schorsing: leden lezen, beheerder schrijft ---------------------------------

create policy schorsing_select on public.schorsing
  for select to authenticated using (public.is_lid(organisatie_id));
create policy schorsing_insert on public.schorsing
  for insert to authenticated with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy schorsing_update on public.schorsing
  for update to authenticated
  using (public.is_lid(organisatie_id, '{beheerder}'))
  with check (public.is_lid(organisatie_id, '{beheerder}'));
create policy schorsing_delete on public.schorsing
  for delete to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));

-- Audit_log: alleen beheerder leest; schrijven alleen via de audit-trigger ----

create policy audit_log_select on public.audit_log
  for select to authenticated using (public.is_lid(organisatie_id, '{beheerder}'));
