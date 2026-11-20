-- ============================================================================
-- maak_seizoen: start- en einddatum optioneel (default null).
--
-- Zonder default vond PostgREST de functie niet als de datums leeg bleven, en
-- maakten de gegenereerde types ze verplicht. Parameters met een default moeten
-- achteraan, dus de functie wordt vervangen (callers gebruiken benoemde argumenten).
-- Inhoud verder ongewijzigd t.o.v. 20261120150000_seizoenswizard.sql.
-- ============================================================================

drop function public.maak_seizoen(uuid, text, date, date, text[], uuid, text[]);

create function public.maak_seizoen(
  p_organisatie_id uuid,
  p_naam text,
  p_klassen text[],
  p_startdatum date default null,
  p_einddatum date default null,
  p_kopieer_van uuid default null,
  p_toernooien text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_seizoen uuid;
  v_onderdeel uuid;
  v_fase uuid;
  v_klassen text[];
  v_toernooien text[];
  i integer;
begin
  select coalesce(array_agg(k order by o), '{}') into v_klassen
  from (
    select distinct on (lower(trim(k))) trim(k) as k, o
    from unnest(p_klassen) with ordinality as t(k, o)
    where trim(k) <> ''
    order by lower(trim(k)), o
  ) s;
  if cardinality(v_klassen) = 0 then
    raise exception 'geef minstens één klasse op';
  end if;

  if p_kopieer_van is not null and not exists (
    select 1 from public.seizoen where id = p_kopieer_van and organisatie_id = p_organisatie_id
  ) then
    raise exception 'het seizoen om van te kopiëren is niet gevonden';
  end if;

  insert into public.seizoen (organisatie_id, naam, startdatum, einddatum, status)
  values (p_organisatie_id, trim(p_naam), p_startdatum, p_einddatum, 'concept')
  returning id into v_seizoen;

  insert into public.onderdeel (organisatie_id, seizoen_id, naam, vorm, volgorde)
  values (p_organisatie_id, v_seizoen, 'Competitie', 'competitie', 0)
  returning id into v_onderdeel;

  insert into public.fase (organisatie_id, onderdeel_id, volgorde, type, regelset, ranglijst)
  values (p_organisatie_id, v_onderdeel, 0, 'poule', public.standaard_regelset(), 'per_poule')
  returning id into v_fase;

  for i in 1 .. cardinality(v_klassen) loop
    insert into public.poule (organisatie_id, fase_id, naam, volgorde)
    values (p_organisatie_id, v_fase, v_klassen[i], i - 1);
  end loop;

  select coalesce(array_agg(trim(t) order by o), '{}') into v_toernooien
  from unnest(p_toernooien) with ordinality as x(t, o)
  where trim(t) <> '';
  for i in 1 .. cardinality(v_toernooien) loop
    insert into public.onderdeel (organisatie_id, seizoen_id, naam, vorm, volgorde)
    values (p_organisatie_id, v_seizoen, v_toernooien[i], 'toernooi', i);
  end loop;

  if p_kopieer_van is not null then
    insert into public.selectie (organisatie_id, seizoen_id, team_id, speler_id)
    select p_organisatie_id, v_seizoen, s.team_id, s.speler_id
    from public.selectie s
    where s.seizoen_id = p_kopieer_van;

    -- Klasse-indeling overnemen op naam van de klasse (competitie-onderdelen).
    insert into public.inschrijving (organisatie_id, poule_id, team_id)
    select distinct on (i_oud.team_id) p_organisatie_id, p_nieuw.id, i_oud.team_id
    from public.inschrijving i_oud
    join public.poule p_oud on p_oud.id = i_oud.poule_id
    join public.fase f_oud on f_oud.id = p_oud.fase_id
    join public.onderdeel o_oud on o_oud.id = f_oud.onderdeel_id
    join public.poule p_nieuw on p_nieuw.fase_id = v_fase and lower(p_nieuw.naam) = lower(p_oud.naam)
    where o_oud.seizoen_id = p_kopieer_van and o_oud.vorm = 'competitie'
    order by i_oud.team_id, f_oud.volgorde;
  end if;

  return v_seizoen;
end;
$$;

revoke execute on function public.maak_seizoen(uuid, text, text[], date, date, uuid, text[]) from public, anon;
grant execute on function public.maak_seizoen(uuid, text, text[], date, date, uuid, text[]) to authenticated;
