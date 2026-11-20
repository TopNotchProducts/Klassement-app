-- ============================================================================
-- Fase 2 — seizoenswizard en klassen indelen, als atomaire functies.
--
-- security invoker: draait met de rechten van de ingelogde gebruiker, dus RLS
-- geldt gewoon (alleen een beheerder van de organisatie kan dit). Geen
-- wijziging aan policies of is_lid().
-- ============================================================================

-- Standaardregelset voor een competitiefase (CLAUDE.md, Regelset per fase).
create function public.standaard_regelset()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'punten', jsonb_build_object('winst', 3, 'gelijk', 1, 'verlies', 0),
    'rangschikking', 'totaal',
    'tiebreakers', jsonb_build_array('doelsaldo', 'onderling', 'doelpunten_voor', 'loting')
  );
$$;

-- Maakt een seizoen met een competitie (één poule per klasse) en optioneel
-- toernooi-onderdelen. Met p_kopieer_van: neemt de selecties (team + speler)
-- over, en deelt teams in bij de klasse met dezelfde naam als in dat seizoen.
create function public.maak_seizoen(
  p_organisatie_id uuid,
  p_naam text,
  p_startdatum date,
  p_einddatum date,
  p_klassen text[],
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

-- Deelt teams in over de poules van één fase. p_indeling: {"<team_id>": "<poule_id>" | null}.
-- Een bestaande inschrijving wordt verplaatst (puntcorrecties blijven bewaard);
-- null betekent: doet niet mee in deze fase.
create function public.deel_klassen_in(p_fase_id uuid, p_indeling jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  r record;
  v_poule uuid;
  v_bestaand uuid;
begin
  select organisatie_id into v_org from public.fase where id = p_fase_id;
  if v_org is null then
    raise exception 'fase niet gevonden';
  end if;

  for r in select key as team_id, value as poule from jsonb_each_text(p_indeling) loop
    v_poule := nullif(r.poule, '')::uuid;
    if v_poule is not null and not exists (
      select 1 from public.poule where id = v_poule and fase_id = p_fase_id
    ) then
      raise exception 'klasse hoort niet bij deze fase';
    end if;

    select i.id into v_bestaand
    from public.inschrijving i
    join public.poule p on p.id = i.poule_id
    where p.fase_id = p_fase_id and i.team_id = r.team_id::uuid;

    if v_poule is null then
      delete from public.inschrijving where id = v_bestaand;
    elsif v_bestaand is null then
      insert into public.inschrijving (organisatie_id, poule_id, team_id)
      values (v_org, v_poule, r.team_id::uuid);
    else
      update public.inschrijving set poule_id = v_poule where id = v_bestaand;
    end if;
  end loop;
end;
$$;

-- Standaard mag PUBLIC elke functie uitvoeren; alleen ingelogde gebruikers hier.
revoke execute on function public.maak_seizoen(uuid, text, date, date, text[], uuid, text[]) from public, anon;
revoke execute on function public.deel_klassen_in(uuid, jsonb) from public, anon;
grant execute on function public.maak_seizoen(uuid, text, date, date, text[], uuid, text[]) to authenticated;
grant execute on function public.deel_klassen_in(uuid, jsonb) to authenticated;
