-- ============================================================================
-- Fase 1 — triggers: event-validatie, afgeleide score, strafschoppen,
-- bevestigen, rechten van de scheidsrechter en audit_log.
--
-- Postgres voert before-triggers per tabel alfabetisch uit; de namen beginnen
-- daarom met a_, b_, c_ waar de volgorde ertoe doet.
--
-- "Ingelogde niet-beheerder": auth.uid() is gezet en de gebruiker is geen
-- beheerder. Server-code met de service role en directe databasesessies
-- (migraties, import) hebben geen auth.uid() en vallen hier buiten; anon kan
-- deze tabellen door RLS niet beschrijven.
-- ============================================================================

create function public.is_ingelogde_niet_beheerder(p_organisatie_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and not public.is_lid(p_organisatie_id, '{beheerder}');
$$;

-- Event-validatie ------------------------------------------------------------

create function public.wedstrijd_event_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
  v_seizoen uuid;
  v_handmatig boolean;
begin
  select wd.thuis_team_id, wd.uit_team_id, wd.status, o.seizoen_id
    into w
  from public.wedstrijd wd
  join public.fase f on f.id = wd.fase_id
  join public.onderdeel o on o.id = f.onderdeel_id
  where wd.id = new.wedstrijd_id;

  if new.team_id is distinct from w.thuis_team_id
     and new.team_id is distinct from w.uit_team_id then
    raise exception 'team speelt niet mee in deze wedstrijd';
  end if;

  if new.speler_id is not null and not exists (
    select 1 from public.selectie s
    where s.seizoen_id = w.seizoen_id
      and s.team_id = new.team_id
      and s.speler_id = new.speler_id
  ) then
    raise exception 'speler zit dit seizoen niet in de selectie van het team';
  end if;

  if new.type = 'doelpunt_onbekend' and w.status = 'bevestigd' then
    select u.handmatig into v_handmatig
    from public.wedstrijd_uitslag u where u.wedstrijd_id = new.wedstrijd_id;
    if not coalesce(v_handmatig, false) then
      raise exception 'een bevestigde wedstrijd kan geen onbekend doelpunt krijgen';
    end if;
  end if;

  return new;
end;
$$;

create trigger a_wedstrijd_event_check
  before insert or update on public.wedstrijd_event
  for each row execute function public.wedstrijd_event_check();

-- Afgeleide score ------------------------------------------------------------

-- Zet score_thuis/score_uit altijd op het aantal doelpunt-events per team,
-- tenzij de uitslag handmatig is. Directe overschrijving wordt zo genegeerd.
create function public.wedstrijd_uitslag_afgeleide_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thuis uuid;
  v_uit uuid;
begin
  if new.handmatig then
    return new;
  end if;

  select thuis_team_id, uit_team_id into v_thuis, v_uit
  from public.wedstrijd where id = new.wedstrijd_id;

  select
    count(*) filter (where e.team_id = v_thuis),
    count(*) filter (where e.team_id = v_uit)
  into new.score_thuis, new.score_uit
  from public.wedstrijd_event e
  where e.wedstrijd_id = new.wedstrijd_id
    and e.type in ('doelpunt', 'eigen_doelpunt', 'doelpunt_onbekend');

  return new;
end;
$$;

create trigger a_wedstrijd_uitslag_afgeleide_score
  before insert or update on public.wedstrijd_uitslag
  for each row execute function public.wedstrijd_uitslag_afgeleide_score();

-- Strafschoppen: alleen bij een knockout en een gelijke stand ----------------

create function public.wedstrijd_uitslag_check_strafschoppen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thuis uuid;
  v_uit uuid;
  v_type public.fase_type;
begin
  if new.winnaar_na_strafschoppen_team_id is null then
    return new;
  end if;

  select wd.thuis_team_id, wd.uit_team_id, f.type into v_thuis, v_uit, v_type
  from public.wedstrijd wd
  join public.fase f on f.id = wd.fase_id
  where wd.id = new.wedstrijd_id;

  if new.score_thuis <> new.score_uit then
    -- Expliciet gezet bij een ongelijke stand: fout. Werd de stand later
    -- ongelijk (een doelpunt erbij of eraf): het veld leegmaken.
    if tg_op = 'INSERT'
       or new.winnaar_na_strafschoppen_team_id
          is distinct from old.winnaar_na_strafschoppen_team_id then
      raise exception 'een winnaar na strafschoppen kan alleen bij een gelijke stand';
    end if;
    new.winnaar_na_strafschoppen_team_id := null;
    return new;
  end if;

  if v_type is distinct from 'knockout' then
    raise exception 'een winnaar na strafschoppen kan alleen in een knockout-fase';
  end if;

  if new.winnaar_na_strafschoppen_team_id is distinct from v_thuis
     and new.winnaar_na_strafschoppen_team_id is distinct from v_uit then
    raise exception 'de winnaar na strafschoppen moet een van beide teams zijn';
  end if;

  return new;
end;
$$;

create trigger b_wedstrijd_uitslag_check_strafschoppen
  before insert or update on public.wedstrijd_uitslag
  for each row execute function public.wedstrijd_uitslag_check_strafschoppen();

-- Een handmatige uitslag (staking/reglementair) is alleen voor de beheerder.
create function public.wedstrijd_uitslag_check_handmatig()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_ingelogde_niet_beheerder(new.organisatie_id) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.handmatig then
      raise exception 'alleen een beheerder kan een handmatige uitslag invoeren';
    end if;
  elsif (new.handmatig or old.handmatig)
     and (new.handmatig, new.score_thuis, new.score_uit, new.reden)
         is distinct from (old.handmatig, old.score_thuis, old.score_uit, old.reden) then
    raise exception 'alleen een beheerder kan een handmatige uitslag wijzigen';
  end if;

  return new;
end;
$$;

create trigger c_wedstrijd_uitslag_check_handmatig
  before insert or update on public.wedstrijd_uitslag
  for each row execute function public.wedstrijd_uitslag_check_handmatig();

-- Elke event-wijziging raakt de uitslag-rij aan (maakt die zo nodig aan); de
-- before-triggers rekenen de score dan opnieuw uit. security definer: houdt
-- alleen afgeleide data bij.
create function public.wedstrijd_uitslag_herbereken(p_wedstrijd_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wedstrijd_uitslag (wedstrijd_id, organisatie_id)
  select w.id, w.organisatie_id from public.wedstrijd w where w.id = p_wedstrijd_id
  on conflict (wedstrijd_id) do update
    set score_thuis = public.wedstrijd_uitslag.score_thuis;
end;
$$;

revoke execute on function public.wedstrijd_uitslag_herbereken(uuid) from public, anon, authenticated;

create function public.wedstrijd_event_werk_uitslag_bij()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.wedstrijd_uitslag_herbereken(old.wedstrijd_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.wedstrijd_id <> old.wedstrijd_id) then
    perform public.wedstrijd_uitslag_herbereken(new.wedstrijd_id);
  end if;
  return null;
end;
$$;

create trigger wedstrijd_event_werk_uitslag_bij
  after insert or update or delete on public.wedstrijd_event
  for each row execute function public.wedstrijd_event_werk_uitslag_bij();

-- Wisselen de teams van een wedstrijd, dan de score opnieuw uitrekenen.
create function public.wedstrijd_teams_gewijzigd()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.wedstrijd_uitslag where wedstrijd_id = new.id) then
    perform public.wedstrijd_uitslag_herbereken(new.id);
  end if;
  return null;
end;
$$;

create trigger wedstrijd_teams_gewijzigd
  after update of thuis_team_id, uit_team_id on public.wedstrijd
  for each row execute function public.wedstrijd_teams_gewijzigd();

-- Wedstrijd: bevestigen en de rechten van de scheidsrechter ------------------

create function public.wedstrijd_check_wijziging()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handmatig boolean;
begin
  -- Een scheidsrechter wijzigt alleen de status, en alleen binnen
  -- gepland → bezig → bevestigd (ook terug, om te corrigeren).
  if public.is_ingelogde_niet_beheerder(old.organisatie_id) then
    if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
      raise exception 'een scheidsrechter kan alleen de status van een wedstrijd wijzigen';
    end if;
    if old.status not in ('gepland', 'bezig', 'bevestigd')
       or new.status not in ('gepland', 'bezig', 'bevestigd') then
      raise exception 'een scheidsrechter kan een wedstrijd niet afgelasten, uitstellen of staken';
    end if;
  end if;

  -- Bevestigen kan niet zolang er een onbekend doelpunt staat (behalve bij
  -- een handmatige uitslag).
  if new.status = 'bevestigd' and old.status is distinct from 'bevestigd' then
    select u.handmatig into v_handmatig
    from public.wedstrijd_uitslag u where u.wedstrijd_id = new.id;
    if not coalesce(v_handmatig, false) and exists (
      select 1 from public.wedstrijd_event e
      where e.wedstrijd_id = new.id and e.type = 'doelpunt_onbekend'
    ) then
      raise exception 'bevestigen kan niet zolang er een onbekend doelpunt staat';
    end if;
  end if;

  return new;
end;
$$;

create trigger a_wedstrijd_check_wijziging
  before update on public.wedstrijd
  for each row execute function public.wedstrijd_check_wijziging();

-- Audit_log ------------------------------------------------------------------

-- Logt elke wijziging aan uitslagen, events, wedstrijden en puntcorrecties.
-- Lege updates (zoals de herbereken-aanraking zonder effect) worden overgeslagen.
create function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oud jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_nieuw jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_rij jsonb := coalesce(v_nieuw, v_oud);
  v_org uuid := (v_rij ->> 'organisatie_id')::uuid;
begin
  if tg_op = 'UPDATE' and v_oud = v_nieuw then
    return null;
  end if;
  -- De organisatie wordt zelf verwijderd (cascade): niets te loggen.
  if not exists (select 1 from public.organisatie where id = v_org) then
    return null;
  end if;

  insert into public.audit_log (organisatie_id, tabel, record_id, actie, oud, nieuw, door)
  values (
    v_org,
    tg_table_name,
    coalesce(v_rij ->> 'id', v_rij ->> 'wedstrijd_id')::uuid,
    lower(tg_op),
    v_oud,
    v_nieuw,
    (select auth.uid())
  );
  return null;
end;
$$;

create trigger audit_wedstrijd
  after insert or update or delete on public.wedstrijd
  for each row execute function public.audit_trigger();
create trigger audit_wedstrijd_event
  after insert or update or delete on public.wedstrijd_event
  for each row execute function public.audit_trigger();
create trigger audit_wedstrijd_uitslag
  after insert or update or delete on public.wedstrijd_uitslag
  for each row execute function public.audit_trigger();
create trigger audit_punt_correctie
  after insert or update or delete on public.punt_correctie
  for each row execute function public.audit_trigger();

-- Interne triggerfuncties zijn niet via de API aan te roepen.
revoke execute on function public.audit_trigger() from public, anon, authenticated;
revoke execute on function public.wedstrijd_event_werk_uitslag_bij() from public, anon, authenticated;
revoke execute on function public.wedstrijd_teams_gewijzigd() from public, anon, authenticated;
