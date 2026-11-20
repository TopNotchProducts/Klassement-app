-- ============================================================================
-- Fase 1 — schema: stamdata en fasemodel.
--
-- Isolatie-ontwerp:
-- * Elke tenant-tabel heeft `organisatie_id not null`.
-- * Verwijzingen naar een andere tenant-tabel lopen via een samengestelde
--   foreign key (x_id, organisatie_id) → x(id, organisatie_id). Daardoor kan
--   een rij van organisatie A nooit naar een rij van organisatie B verwijzen,
--   ook niet via een bug in de app of de service role.
-- * RLS en policies staan in de volgende migratie (is_lid()).
-- ============================================================================

-- Enums -----------------------------------------------------------------------

create type public.lid_rol as enum ('beheerder', 'scheidsrechter', 'aanvoerder');
create type public.seizoen_status as enum ('concept', 'actief', 'afgesloten');
create type public.onderdeel_vorm as enum ('competitie', 'toernooi');
create type public.fase_type as enum ('poule', 'handmatig', 'knockout');
create type public.fase_ranglijst as enum ('per_poule', 'totaal');
create type public.wedstrijd_status as enum
  ('gepland', 'bezig', 'bevestigd', 'afgelast', 'uitgesteld', 'gestaakt');
create type public.wedstrijd_event_type as enum
  ('doelpunt', 'eigen_doelpunt', 'doelpunt_onbekend', 'geel', 'groen', 'rood');
create type public.wedstrijd_slot as enum ('thuis', 'uit');

-- Organisatie en leden -------------------------------------------------------

create table public.organisatie (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (length(trim(naam)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  kleur_primair text check (kleur_primair ~ '^#[0-9a-fA-F]{6}$'),
  kleur_secundair text check (kleur_secundair ~ '^#[0-9a-fA-F]{6}$'),
  sportprofiel text not null default 'zaalvoetbal',
  instellingen jsonb not null default '{}'::jsonb,
  aangemaakt_op timestamptz not null default now()
);

-- De slug is onveranderlijk na aanmaak (CLAUDE.md, Conventies).
create function public.organisatie_slug_onveranderlijk()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'de slug van een organisatie kan niet worden gewijzigd';
  end if;
  return new;
end;
$$;

create trigger organisatie_slug_onveranderlijk
  before update on public.organisatie
  for each row execute function public.organisatie_slug_onveranderlijk();

-- Platformbeheerders (Bart). Geen tenant-tabel; alleen via de service role te vullen.
create table public.platform_beheerder (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.organisatie_lid (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol public.lid_rol not null,
  unique (organisatie_id, user_id, rol)
);
create index organisatie_lid_user_idx on public.organisatie_lid (user_id);

-- Stamdata -------------------------------------------------------------------

create table public.locatie (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  naam text not null check (length(trim(naam)) > 0),
  plaats text,
  unique (id, organisatie_id)
);
create index locatie_org_idx on public.locatie (organisatie_id);

create table public.veld (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  locatie_id uuid not null,
  naam text not null check (length(trim(naam)) > 0),
  volgorde integer not null default 0,
  unique (id, organisatie_id),
  foreign key (locatie_id, organisatie_id)
    references public.locatie (id, organisatie_id) on delete cascade
);
create index veld_org_idx on public.veld (organisatie_id);
create index veld_locatie_idx on public.veld (locatie_id);

create table public.seizoen (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  naam text not null check (length(trim(naam)) > 0),
  startdatum date,
  einddatum date,
  status public.seizoen_status not null default 'concept',
  unique (id, organisatie_id),
  check (einddatum is null or startdatum is null or einddatum >= startdatum)
);
create index seizoen_org_idx on public.seizoen (organisatie_id);

-- Een speelmoment is wekelijks (weekdag, ISO 1 = maandag) óf op één datum.
-- `velden` bevat veld-id's; een trigger controleert dat ze bij de organisatie horen.
create table public.speelmoment (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  seizoen_id uuid not null,
  weekdag smallint check (weekdag between 1 and 7),
  datum date,
  starttijden time[] not null default '{}',
  velden uuid[] not null default '{}',
  check (num_nonnulls(weekdag, datum) = 1),
  foreign key (seizoen_id, organisatie_id)
    references public.seizoen (id, organisatie_id) on delete cascade
);
create index speelmoment_org_idx on public.speelmoment (organisatie_id);
create index speelmoment_seizoen_idx on public.speelmoment (seizoen_id);

create function public.speelmoment_check_velden()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.velden) as v(id)
    where not exists (
      select 1 from public.veld f
      where f.id = v.id and f.organisatie_id = new.organisatie_id
    )
  ) then
    raise exception 'speelmoment verwijst naar een veld buiten de organisatie';
  end if;
  return new;
end;
$$;

create trigger speelmoment_check_velden
  before insert or update on public.speelmoment
  for each row execute function public.speelmoment_check_velden();

-- Team: stabiele identiteit, muteerbare naam. Bewust GEEN klasse-veld.
create table public.team (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  naam text not null check (length(trim(naam)) > 0),
  foto_url text,
  foto_toestemming boolean not null default false,
  unique (id, organisatie_id)
);
create index team_org_idx on public.team (organisatie_id);

-- Speler: bewust GEEN geboortedatum.
create table public.speler (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  naam text not null check (length(trim(naam)) > 0),
  rugnummer smallint check (rugnummer between 0 and 999),
  verborgen boolean not null default false,
  foto_toestemming boolean not null default false,
  unique (id, organisatie_id)
);
create index speler_org_idx on public.speler (organisatie_id);

-- Fasemodel ------------------------------------------------------------------

create table public.onderdeel (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  seizoen_id uuid not null,
  naam text not null check (length(trim(naam)) > 0),
  vorm public.onderdeel_vorm not null,
  volgorde integer not null default 0,
  unique (id, organisatie_id),
  foreign key (seizoen_id, organisatie_id)
    references public.seizoen (id, organisatie_id) on delete cascade
);
create index onderdeel_org_idx on public.onderdeel (organisatie_id);
create index onderdeel_seizoen_idx on public.onderdeel (seizoen_id);

create table public.fase (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  onderdeel_id uuid not null,
  volgorde integer not null default 0,
  type public.fase_type not null,
  regelset jsonb not null default '{}'::jsonb,
  ranglijst public.fase_ranglijst not null default 'per_poule',
  unique (id, organisatie_id),
  foreign key (onderdeel_id, organisatie_id)
    references public.onderdeel (id, organisatie_id) on delete cascade
);
create index fase_org_idx on public.fase (organisatie_id);
create index fase_onderdeel_idx on public.fase (onderdeel_id);

create table public.poule (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  fase_id uuid not null,
  naam text not null check (length(trim(naam)) > 0),
  volgorde integer not null default 0,
  unique (id, organisatie_id),
  unique (id, fase_id),
  foreign key (fase_id, organisatie_id)
    references public.fase (id, organisatie_id) on delete cascade
);
create index poule_org_idx on public.poule (organisatie_id);
create index poule_fase_idx on public.poule (fase_id);

-- Inschrijving: team in een poule. Vervangt WAC's team_seizoen_klasse.
create table public.inschrijving (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  poule_id uuid not null,
  team_id uuid not null,
  unique (id, organisatie_id),
  unique (poule_id, team_id),
  foreign key (poule_id, organisatie_id)
    references public.poule (id, organisatie_id) on delete cascade,
  foreign key (team_id, organisatie_id)
    references public.team (id, organisatie_id) on delete no action
);
create index inschrijving_org_idx on public.inschrijving (organisatie_id);
create index inschrijving_team_idx on public.inschrijving (team_id);

-- Selectie: speler in een team voor een seizoen. Eén team per speler per seizoen.
create table public.selectie (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  seizoen_id uuid not null,
  team_id uuid not null,
  speler_id uuid not null,
  unique (seizoen_id, speler_id),
  foreign key (seizoen_id, organisatie_id)
    references public.seizoen (id, organisatie_id) on delete cascade,
  foreign key (team_id, organisatie_id)
    references public.team (id, organisatie_id) on delete cascade,
  foreign key (speler_id, organisatie_id)
    references public.speler (id, organisatie_id) on delete cascade
);
create index selectie_org_idx on public.selectie (organisatie_id);
create index selectie_team_idx on public.selectie (team_id);
create index selectie_speler_idx on public.selectie (speler_id);

create table public.bracket (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  fase_id uuid not null,
  naam text not null check (length(trim(naam)) > 0),
  label_prefix text,
  unique (id, organisatie_id),
  unique (id, fase_id),
  foreign key (fase_id, organisatie_id)
    references public.fase (id, organisatie_id) on delete cascade
);
create index bracket_org_idx on public.bracket (organisatie_id);
create index bracket_fase_idx on public.bracket (fase_id);

create table public.doorstroomregel (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  van_fase_id uuid not null,
  positie_van integer not null check (positie_van >= 1),
  positie_tot integer not null,
  naar_bracket_id uuid,
  naar_poule_id uuid,
  check (positie_tot >= positie_van),
  check (num_nonnulls(naar_bracket_id, naar_poule_id) = 1),
  foreign key (van_fase_id, organisatie_id)
    references public.fase (id, organisatie_id) on delete cascade,
  foreign key (naar_bracket_id, organisatie_id)
    references public.bracket (id, organisatie_id) on delete cascade,
  foreign key (naar_poule_id, organisatie_id)
    references public.poule (id, organisatie_id) on delete cascade
);
create index doorstroomregel_org_idx on public.doorstroomregel (organisatie_id);
create index doorstroomregel_fase_idx on public.doorstroomregel (van_fase_id);

-- Wedstrijden ----------------------------------------------------------------

create table public.wedstrijd (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  fase_id uuid not null,
  poule_id uuid,
  bracket_id uuid,
  ronde integer,
  slot integer,
  veld_id uuid,
  datum date,
  starttijd time,
  thuis_team_id uuid,
  uit_team_id uuid,
  status public.wedstrijd_status not null default 'gepland',
  label text,
  winnaar_naar_wedstrijd_id uuid,
  winnaar_naar_slot public.wedstrijd_slot,
  unique (id, organisatie_id),
  check (num_nonnulls(poule_id, bracket_id) <= 1),
  check (thuis_team_id is null or uit_team_id is null or thuis_team_id <> uit_team_id),
  check ((winnaar_naar_wedstrijd_id is null) = (winnaar_naar_slot is null)),
  check (winnaar_naar_wedstrijd_id is null or winnaar_naar_wedstrijd_id <> id),
  foreign key (fase_id, organisatie_id)
    references public.fase (id, organisatie_id) on delete cascade,
  -- poule en bracket horen bij dezelfde fase als de wedstrijd
  foreign key (poule_id, fase_id)
    references public.poule (id, fase_id) on delete cascade,
  foreign key (bracket_id, fase_id)
    references public.bracket (id, fase_id) on delete cascade,
  foreign key (veld_id, organisatie_id)
    references public.veld (id, organisatie_id) on delete set null (veld_id),
  foreign key (thuis_team_id, organisatie_id)
    references public.team (id, organisatie_id) on delete no action,
  foreign key (uit_team_id, organisatie_id)
    references public.team (id, organisatie_id) on delete no action,
  foreign key (winnaar_naar_wedstrijd_id, organisatie_id)
    references public.wedstrijd (id, organisatie_id) on delete set null (winnaar_naar_wedstrijd_id)
);
create index wedstrijd_org_idx on public.wedstrijd (organisatie_id);
create index wedstrijd_fase_idx on public.wedstrijd (fase_id);
create index wedstrijd_poule_idx on public.wedstrijd (poule_id);
create index wedstrijd_bracket_idx on public.wedstrijd (bracket_id);
create index wedstrijd_datum_idx on public.wedstrijd (organisatie_id, datum);
create index wedstrijd_thuis_idx on public.wedstrijd (thuis_team_id);
create index wedstrijd_uit_idx on public.wedstrijd (uit_team_id);

-- Het scheidsrechterstoken staat in een eigen tabel, niet op `wedstrijd`: de
-- wedstrijdtabel is publiek leesbaar, het token nooit.
create table public.wedstrijd_token (
  wedstrijd_id uuid primary key,
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  aangemaakt_op timestamptz not null default now(),
  foreign key (wedstrijd_id, organisatie_id)
    references public.wedstrijd (id, organisatie_id) on delete cascade
);
create index wedstrijd_token_org_idx on public.wedstrijd_token (organisatie_id);

create table public.wedstrijd_event (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  wedstrijd_id uuid not null,
  type public.wedstrijd_event_type not null,
  -- bij (eigen) doelpunten: het team dat het doelpunt krijgt
  team_id uuid not null,
  speler_id uuid,
  minuut smallint check (minuut between 0 and 200),
  aangemaakt_op timestamptz not null default now(),
  -- doelpunt en kaarten hebben een speler; eigen doelpunt en onbekend niet
  check (
    (type in ('doelpunt', 'geel', 'groen', 'rood')) = (speler_id is not null)
  ),
  foreign key (wedstrijd_id, organisatie_id)
    references public.wedstrijd (id, organisatie_id) on delete cascade,
  foreign key (team_id, organisatie_id)
    references public.team (id, organisatie_id) on delete no action,
  foreign key (speler_id, organisatie_id)
    references public.speler (id, organisatie_id) on delete no action
);
create index wedstrijd_event_org_idx on public.wedstrijd_event (organisatie_id);
create index wedstrijd_event_wedstrijd_idx on public.wedstrijd_event (wedstrijd_id);
create index wedstrijd_event_speler_idx on public.wedstrijd_event (speler_id);

create table public.wedstrijd_uitslag (
  wedstrijd_id uuid primary key,
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  score_thuis integer not null default 0 check (score_thuis >= 0),
  score_uit integer not null default 0 check (score_uit >= 0),
  handmatig boolean not null default false,
  reden text,
  winnaar_na_strafschoppen_team_id uuid,
  check (not handmatig or length(trim(coalesce(reden, ''))) > 0),
  foreign key (wedstrijd_id, organisatie_id)
    references public.wedstrijd (id, organisatie_id) on delete cascade,
  foreign key (winnaar_na_strafschoppen_team_id, organisatie_id)
    references public.team (id, organisatie_id) on delete no action
);
create index wedstrijd_uitslag_org_idx on public.wedstrijd_uitslag (organisatie_id);

create table public.punt_correctie (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  inschrijving_id uuid not null,
  punten integer not null check (punten <> 0),
  reden text not null check (length(trim(reden)) > 0),
  aangemaakt_op timestamptz not null default now(),
  foreign key (inschrijving_id, organisatie_id)
    references public.inschrijving (id, organisatie_id) on delete cascade
);
create index punt_correctie_org_idx on public.punt_correctie (organisatie_id);
create index punt_correctie_inschrijving_idx on public.punt_correctie (inschrijving_id);

-- Schorsing: alleen registratie, geen automatische gevolgen.
create table public.schorsing (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  speler_id uuid not null,
  wedstrijden smallint check (wedstrijden > 0),
  van date,
  tot date,
  reden text,
  aangemaakt_op timestamptz not null default now(),
  check (wedstrijden is not null or (van is not null and tot is not null)),
  check (tot is null or van is null or tot >= van),
  foreign key (speler_id, organisatie_id)
    references public.speler (id, organisatie_id) on delete cascade
);
create index schorsing_org_idx on public.schorsing (organisatie_id);
create index schorsing_speler_idx on public.schorsing (speler_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  tabel text not null,
  record_id uuid not null,
  actie text not null check (actie in ('insert', 'update', 'delete')),
  oud jsonb,
  nieuw jsonb,
  door uuid,
  op timestamptz not null default now()
);
create index audit_log_org_op_idx on public.audit_log (organisatie_id, op desc);
create index audit_log_record_idx on public.audit_log (record_id);

-- Nieuws: titel volgens de conventie "Label: naam".
create table public.nieuws (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  titel text not null check (length(trim(titel)) > 0),
  datum date not null default (now() at time zone 'Europe/Amsterdam')::date,
  inhoud text not null default ''
);
create index nieuws_org_datum_idx on public.nieuws (organisatie_id, datum desc);

-- Historie: statische archiefrecords van vóór de app (geen afgeleide data) ----

create table public.historie_eindstand (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  seizoen_naam text not null,
  onderdeel_naam text not null,
  positie integer not null check (positie >= 1),
  team_naam text not null,
  gespeeld integer,
  gewonnen integer,
  gelijk integer,
  verloren integer,
  doelpunten_voor integer,
  doelpunten_tegen integer,
  punten integer
);
create index historie_eindstand_org_idx on public.historie_eindstand (organisatie_id);

create table public.historie_topscorer (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  seizoen_naam text not null,
  onderdeel_naam text,
  speler_naam text not null,
  team_naam text,
  doelpunten integer not null check (doelpunten >= 0)
);
create index historie_topscorer_org_idx on public.historie_topscorer (organisatie_id);

create table public.historie_bekerwinnaar (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisatie (id) on delete cascade,
  seizoen_naam text not null,
  beker_naam text not null,
  winnaar_team_naam text not null,
  finalist_team_naam text,
  uitslag text
);
create index historie_bekerwinnaar_org_idx on public.historie_bekerwinnaar (organisatie_id);
