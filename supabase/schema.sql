-- =============================================================================
-- Potesjarm – databaseskjema
--
-- Bygget rundt to prinsipper:
--   1. Ingenting falskt. Det finnes ingen kolonner for "oppblåste" tellere.
--      Alle tall utledes fra faktiske rader, eller vedlikeholdes av triggere
--      som teller ekte rader.
--   2. Geografi først. Alt lokalt innhold henger på en kommune og et punkt,
--      slik at radius-søk fungerer i hele Norge fra dag 1.
--
-- Kjør i rekkefølge. Krever Supabase (auth-skjemaet finnes fra før).
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "cube";
create extension if not exists "earthdistance";

-- =============================================================================
-- 1. GEOGRAFI (referansedata)
-- Fylles fra Kartverket/SSB. Dette er offentlige data, ikke brukerinnhold.
-- =============================================================================

create table if not exists counties (            -- fylker
  id            text primary key,                -- 'rogaland'
  name          text not null
);

create table if not exists municipalities (      -- kommuner
  id            text primary key,                -- 'stavanger'
  county_id     text not null references counties(id),
  name          text not null,
  kommunenummer text unique,                     -- offisielt nummer fra SSB
  lat           double precision not null,
  lng           double precision not null,
  -- Settes til true når vi aktivt bygger community her. Styrer utrulling,
  -- ikke tilgang: appen virker i hele Norge uansett.
  launched      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists municipalities_county_idx on municipalities(county_id);

create table if not exists neighborhoods (       -- bydeler/områder
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id) on delete cascade,
  name            text not null,
  lat             double precision,
  lng             double precision,
  unique (municipality_id, name)
);

-- =============================================================================
-- 2. BRUKERE OG HUNDER
-- =============================================================================

create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  avatar_url      text,
  municipality_id text references municipalities(id),
  neighborhood_id uuid references neighborhoods(id),
  -- null = hele kommunen
  radius_km       integer check (radius_km is null or radius_km between 1 and 100),
  -- Omtrentlig posisjon. Vi lagrer aldri nøyaktig hjemmeadresse.
  approx_lat      double precision,
  approx_lng      double precision,
  bio             text,
  verified_at     timestamptz,
  is_founder      boolean not null default false,
  -- Moderering
  suspended_at    timestamptz,
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now()
);
create index if not exists profiles_municipality_idx on profiles(municipality_id);

create table if not exists dogs (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  name            text not null,
  breed           text,
  birth_date      date,
  sex             text check (sex in ('hann','tispe')),
  size            text check (size in ('liten','medium','stor')),
  energy          smallint check (energy between 1 and 5),
  neutered        boolean,
  -- Lekestil og komfort med andre hunder, brukt til matching
  play_styles     text[] not null default '{}',
  comfort         text[] not null default '{}',
  reactive        boolean not null default false,
  photo_url       text,
  about           text,
  created_at      timestamptz not null default now()
);
create index if not exists dogs_owner_idx on dogs(owner_id);

create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  dog_id      uuid not null references dogs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, dog_id)
);

-- =============================================================================
-- 3. STEDER (redaksjonelt seed + brukerbidrag)
-- =============================================================================

create table if not exists places (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id),
  name            text not null,
  kind            text not null check (kind in ('tursti','park','strand','skog','utsiktspunkt','hundepark','hundevennlig','veterinaer')),
  lat             double precision not null,
  lng             double precision not null,
  about           text,
  -- 'editorial' = lagt inn av oss som offentlig informasjon (merkes i UI),
  -- 'user'      = foreslått av en bruker
  source          text not null default 'user' check (source in ('editorial','user')),
  created_by      uuid references profiles(id) on delete set null,
  -- Ingen påstander vi ikke kan stå for: et sted regnes som bekreftet først
  -- når nok ekte brukere har vært der.
  verified_count  integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists places_municipality_idx on places(municipality_id);
create index if not exists places_geo_idx on places using gist (ll_to_earth(lat, lng));

create table if not exists place_verifications (
  place_id   uuid not null references places(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, profile_id)
);

-- Vurderinger finnes bare når ekte brukere har skrevet dem.
create table if not exists place_reviews (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references places(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (place_id, profile_id)
);

create table if not exists routes (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id),
  created_by      uuid references profiles(id) on delete set null,
  title           text not null,
  distance_km     numeric(6,2),
  duration_min    integer,
  difficulty      text check (difficulty in ('lett','moderat','krevende')),
  path            jsonb,                          -- [[lat,lng], ...]
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- 4. SOSIALT INNHOLD
-- =============================================================================

create table if not exists groups (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text references municipalities(id),
  name            text not null,
  about           text,
  kind            text not null default 'lokalt' check (kind in ('rase','aktivitet','valp','lokalt','annet')),
  photo_url       text,
  -- Offisielle områdegrupper opprettes av oss når en kommune åpnes.
  -- De starter tomme; vi legger aldri inn medlemmer som ikke finnes.
  is_official     boolean not null default false,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists groups_municipality_idx on groups(municipality_id);

create table if not exists group_members (
  group_id   uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('member','moderator','admin')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references profiles(id) on delete cascade,
  dog_id          uuid references dogs(id) on delete set null,
  group_id        uuid references groups(id) on delete cascade,
  municipality_id text references municipalities(id),
  kind            text not null default 'photo' check (kind in ('photo','walk','question','text')),
  body            text,
  photo_url       text,
  place_id        uuid references places(id) on delete set null,
  walk_id         uuid,                            -- settes etter walks er opprettet
  lat             double precision,
  lng             double precision,
  created_at      timestamptz not null default now()
);
create index if not exists posts_municipality_created_idx on posts(municipality_id, created_at desc);
create index if not exists posts_group_idx on posts(group_id, created_at desc);

create table if not exists post_likes (
  post_id    uuid not null references posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments(post_id, created_at);

create table if not exists saved_posts (
  profile_id uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

-- =============================================================================
-- 5. NÅ SKJER (meetups) OG ARRANGEMENTER
-- =============================================================================

-- Kjernen i "Nå skjer": alt her utløper av seg selv. Det er derfor et tomt
-- "Nå skjer" er ærlig – det betyr at ingenting skjer akkurat nå.
create table if not exists meetups (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references profiles(id) on delete cascade,
  municipality_id text not null references municipalities(id),
  neighborhood_id uuid references neighborhoods(id),
  kind            text not null check (kind in ('tur','lek','trening','valp','kafe','sporsmal','hjelp')),
  title           text not null,
  note            text,
  place_id        uuid references places(id) on delete set null,
  place_text      text,
  lat             double precision,
  lng             double precision,
  starts_at       timestamptz not null,
  expires_at      timestamptz not null,
  max_dogs        smallint not null default 8 check (max_dogs between 2 and 50),
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists meetups_active_idx on meetups(municipality_id, expires_at) where cancelled_at is null;
create index if not exists meetups_geo_idx on meetups using gist (ll_to_earth(lat, lng));

create table if not exists meetup_participants (
  meetup_id  uuid not null references meetups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  dog_id     uuid references dogs(id) on delete set null,
  joined_at  timestamptz not null default now(),
  primary key (meetup_id, profile_id)
);

create table if not exists events (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid references profiles(id) on delete set null,
  group_id        uuid references groups(id) on delete set null,
  municipality_id text not null references municipalities(id),
  title           text not null,
  about           text,
  kind            text check (kind in ('tur','valp','fjell','sosialt','kurs','dugnad')),
  place_id        uuid references places(id) on delete set null,
  place_text      text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  photo_url       text,
  -- Offentlige arrangementer vi har hentet fra åpne kilder merkes slik,
  -- så de ikke ser ut som om en bruker har laget dem.
  source          text not null default 'user' check (source in ('user','editorial')),
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists events_municipality_starts_idx on events(municipality_id, starts_at);

create table if not exists event_participants (
  event_id   uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- =============================================================================
-- 6. AKTIVITET OG GAMIFICATION
-- Alt her er brukerens egne, faktiske data.
-- =============================================================================

-- Én rad per tur-FORSØK, ikke bare fullførte turer – `valid` skiller dem.
-- Klienten (app/lib/track.js) kjører samme filtrering lokalt før den i det
-- hele tatt kaller finishWalk(); dette er den samme regelen speilet i
-- databasen, slik at ingen klient kan omgå den ved å skrive rett til API-et.
create table if not exists walks (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  dog_id        uuid references dogs(id) on delete set null,
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  distance_m    integer not null check (distance_m >= 0),
  duration_s    integer not null check (duration_s >= 0),
  -- Gyldig = distance_m >= MIN_VALID_WALK_M (se app/lib/track.js GPS_CONFIG).
  -- Kun gyldige turer teller til streak, poter, merker og utfordringer.
  valid         boolean not null default false,
  avg_pace_s_per_km integer,             -- null hvis for kort til å bety noe
  gps_quality   text check (gps_quality in ('good','fair','poor')),
  elevation_m   integer,
  place_id      uuid references places(id) on delete set null,
  paws_earned   integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists walks_profile_started_idx on walks(profile_id, started_at desc);

-- Rå GPS-punkter bak en tur, med hvorfor hvert punkt ble godkjent eller
-- forkastet – gjør GPS-filtreringen etterprøvbar i produksjon. Valgfritt å
-- beholde permanent (personvern/lagringsvolum); arkitekturen støtter det,
-- men en rimelig policy er å slette rådata etter N dager og bare beholde
-- den aggregerte `walks`-raden.
create table if not exists walk_points (
  id          bigint generated always as identity primary key,
  walk_id     uuid not null references walks(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  accuracy_m  real,
  recorded_at timestamptz not null,
  accepted    boolean not null,
  -- poor_accuracy | non_increasing_time | unrealistic_speed |
  -- below_movement_threshold | null (når accepted = true)
  rejection_reason text
);
create index if not exists walk_points_walk_idx on walk_points(walk_id, recorded_at);

-- Poter tjenes bare av handlinger som faktisk er utført. Hver rad peker på
-- kilden sin, så en total alltid kan revideres.
create table if not exists paw_ledger (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  amount     integer not null,
  reason     text not null check (reason in ('walk','streak','new_place','verify_place','meetup_joined','meetup_hosted','add_place','referral','challenge')),
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index if not exists paw_ledger_profile_idx on paw_ledger(profile_id, created_at desc);

create table if not exists streaks (
  profile_id    uuid primary key references profiles(id) on delete cascade,
  current_days  integer not null default 0,
  longest_days  integer not null default 0,
  last_walk_on  date
);

-- Definisjoner (vedlikeholdes av oss)
create table if not exists badges (
  id       text primary key,
  name     text not null,
  metric   text not null,
  target   numeric not null,
  icon     text,
  color    text
);

create table if not exists challenges (
  id              text primary key,
  scope           text not null check (scope in ('daglig','ukentlig','sesong','lokal')),
  title           text not null,
  metric          text not null,
  target          numeric not null,
  unit            text,
  reward_paws     integer not null default 0,
  municipality_id text references municipalities(id),  -- null = nasjonal
  starts_at       timestamptz,
  ends_at         timestamptz
);

-- Fremgang (brukerens egen)
create table if not exists badge_awards (
  profile_id uuid not null references profiles(id) on delete cascade,
  badge_id   text not null references badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

create table if not exists challenge_progress (
  profile_id   uuid not null references profiles(id) on delete cascade,
  challenge_id text not null references challenges(id) on delete cascade,
  value        numeric not null default 0,
  completed_at timestamptz,
  primary key (profile_id, challenge_id)
);

-- =============================================================================
-- 7. MELDINGER OG VARSLER
-- =============================================================================

create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  ref_table  text,
  ref_id     uuid,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_profile_idx on notifications(profile_id, created_at desc);

create table if not exists notification_settings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  meetups    boolean not null default true,
  messages   boolean not null default true,
  streak     boolean not null default true,
  events     boolean not null default true,
  community  boolean not null default true,
  lost_dog   boolean not null default true
);

-- =============================================================================
-- 8. TRYGGHET OG MODERERING
-- =============================================================================

create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references profiles(id) on delete cascade,
  target_table  text not null,
  target_id     uuid not null,
  reason        text not null,
  details       text,
  status        text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at    timestamptz not null default now()
);

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists lost_dog_alerts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  dog_id          uuid not null references dogs(id) on delete cascade,
  municipality_id text not null references municipalities(id),
  last_seen_text  text,
  last_seen_at    timestamptz,
  lat             double precision,
  lng             double precision,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists lost_dog_active_idx on lost_dog_alerts(municipality_id) where resolved_at is null;

-- =============================================================================
-- 9. INVITASJONER OG REFERRALS
-- Belønning gis først når den inviterte faktisk er i gang – ikke ved klikk.
-- =============================================================================

create table if not exists invitations (
  id           uuid primary key default gen_random_uuid(),
  inviter_id   uuid not null references profiles(id) on delete cascade,
  code         text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at   timestamptz not null default now()
);

create table if not exists referrals (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  invitee_id    uuid not null references profiles(id) on delete cascade,
  signed_up_at  timestamptz not null default now(),
  dog_added_at  timestamptz,
  first_walk_at timestamptz,
  -- Aktivert = registrert + lagt til hund + gått første tur
  activated_at  timestamptz,
  unique (invitee_id)
);

-- =============================================================================
-- 10. RLS
-- =============================================================================

alter table profiles              enable row level security;
alter table dogs                  enable row level security;
alter table follows               enable row level security;
alter table posts                 enable row level security;
alter table post_likes            enable row level security;
alter table comments              enable row level security;
alter table saved_posts           enable row level security;
alter table groups                enable row level security;
alter table group_members         enable row level security;
alter table meetups               enable row level security;
alter table meetup_participants   enable row level security;
alter table events                enable row level security;
alter table event_participants    enable row level security;
alter table walks                 enable row level security;
alter table walk_points           enable row level security;
alter table paw_ledger            enable row level security;
alter table streaks               enable row level security;
alter table badge_awards          enable row level security;
alter table challenge_progress    enable row level security;
alter table conversations         enable row level security;
alter table conversation_members  enable row level security;
alter table messages              enable row level security;
alter table notifications         enable row level security;
alter table notification_settings enable row level security;
alter table reports               enable row level security;
alter table blocks                enable row level security;
alter table lost_dog_alerts       enable row level security;
alter table places                enable row level security;
alter table place_verifications   enable row level security;
alter table place_reviews         enable row level security;
alter table routes                enable row level security;
alter table invitations           enable row level security;
alter table referrals             enable row level security;

-- Referansedata er offentlig lesbart
alter table counties       enable row level security;
alter table municipalities enable row level security;
alter table neighborhoods  enable row level security;
alter table badges         enable row level security;
alter table challenges     enable row level security;

create policy "ref read" on counties       for select using (true);
create policy "ref read" on municipalities for select using (true);
create policy "ref read" on neighborhoods  for select using (true);
create policy "ref read" on badges         for select using (true);
create policy "ref read" on challenges     for select using (true);

-- Profiler: alle innloggede kan se profiler som ikke har skjult seg,
-- men bare eier kan endre.
create policy "profiles read"   on profiles for select using (auth.role() = 'authenticated');
create policy "profiles insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles update" on profiles for update using (auth.uid() = id);

create policy "dogs read"   on dogs for select using (auth.role() = 'authenticated');
create policy "dogs write"  on dogs for all    using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "follows read"  on follows for select using (auth.role() = 'authenticated');
create policy "follows write" on follows for all    using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "posts read"   on posts for select using (auth.role() = 'authenticated');
create policy "posts write"  on posts for all    using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "likes read"   on post_likes for select using (auth.role() = 'authenticated');
create policy "likes write"  on post_likes for all    using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "comments read"  on comments for select using (auth.role() = 'authenticated');
create policy "comments write" on comments for all    using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "saved own" on saved_posts for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "groups read"   on groups for select using (auth.role() = 'authenticated');
create policy "groups create" on groups for insert with check (auth.uid() = created_by);
create policy "groups update" on groups for update using (auth.uid() = created_by);

create policy "members read"  on group_members for select using (auth.role() = 'authenticated');
create policy "members write" on group_members for all    using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "meetups read"   on meetups for select using (auth.role() = 'authenticated');
create policy "meetups write"  on meetups for all    using (auth.uid() = host_id) with check (auth.uid() = host_id);

create policy "mp read"  on meetup_participants for select using (auth.role() = 'authenticated');
create policy "mp write" on meetup_participants for all    using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "events read"  on events for select using (auth.role() = 'authenticated');
create policy "events write" on events for all    using (auth.uid() = host_id) with check (auth.uid() = host_id);

create policy "ep read"  on event_participants for select using (auth.role() = 'authenticated');
create policy "ep write" on event_participants for all    using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Egne data
create policy "walks own"     on walks              for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "walk_points own" on walk_points for all
  using (exists (select 1 from walks w where w.id = walk_id and w.profile_id = auth.uid()))
  with check (exists (select 1 from walks w where w.id = walk_id and w.profile_id = auth.uid()));
create policy "paws own"      on paw_ledger         for select using (auth.uid() = profile_id);
create policy "streaks own"   on streaks            for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "awards own"    on badge_awards       for select using (auth.uid() = profile_id);
create policy "progress own"  on challenge_progress for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "notif own"     on notifications      for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "notifset own"  on notification_settings for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Samtaler: bare deltakere
create policy "conv read" on conversations for select
  using (exists (select 1 from conversation_members m where m.conversation_id = id and m.profile_id = auth.uid()));
create policy "cm own" on conversation_members for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "msg read" on messages for select
  using (exists (select 1 from conversation_members m where m.conversation_id = conversation_id and m.profile_id = auth.uid()));
create policy "msg write" on messages for insert
  with check (auth.uid() = sender_id and exists (
    select 1 from conversation_members m where m.conversation_id = conversation_id and m.profile_id = auth.uid()));

-- Trygghet
create policy "reports write" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports own"   on reports for select using (auth.uid() = reporter_id);
create policy "blocks own"    on blocks  for all    using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "lost read"     on lost_dog_alerts for select using (auth.role() = 'authenticated');
create policy "lost write"    on lost_dog_alerts for all    using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Steder: alle kan lese, innloggede kan foreslå, bare eget bidrag kan endres
create policy "places read"   on places for select using (true);
create policy "places insert" on places for insert with check (auth.uid() = created_by and source = 'user');
create policy "places update" on places for update using (auth.uid() = created_by);
create policy "verif read"    on place_verifications for select using (auth.role() = 'authenticated');
create policy "verif write"   on place_verifications for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "reviews read"  on place_reviews for select using (true);
create policy "reviews write" on place_reviews for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "routes read"   on routes for select using (true);
create policy "routes write"  on routes for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "inv own" on invitations for all using (auth.uid() = inviter_id) with check (auth.uid() = inviter_id);
create policy "ref read" on referrals for select
  using (auth.uid() = invitee_id or exists (select 1 from invitations i where i.id = invitation_id and i.inviter_id = auth.uid()));

-- =============================================================================
-- 11. HJELPEFUNKSJONER
-- =============================================================================

-- Aktive treff innenfor radius. Er det ingen, returneres ingenting – og da
-- skal appen vise at det ikke skjer noe, ikke finne på noe.
create or replace function meetups_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 10
)
returns setof meetups
language sql stable
as $$
  select m.*
  from meetups m
  where m.cancelled_at is null
    and m.expires_at > now()
    and (
      p_radius_km is null
      or m.lat is null
      or earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(m.lat, m.lng)) <= p_radius_km * 1000
    )
  order by m.starts_at asc;
$$;

-- Antall aktive hunder i en kommune siste 30 dager. Brukes til å avgjøre om
-- lokal toppliste skal låses opp – aldri til å pynte på et tall i UI.
create or replace function active_dogs_in(p_municipality text)
returns integer
language sql stable
as $$
  select count(distinct d.id)::int
  from dogs d
  join profiles p on p.id = d.owner_id
  where p.municipality_id = p_municipality
    and p.last_active_at > now() - interval '30 days'
    and p.suspended_at is null;
$$;

-- Holder verified_count på steder i synk med faktiske bekreftelser.
create or replace function sync_place_verified() returns trigger
language plpgsql as $$
begin
  update places
     set verified_count = (select count(*) from place_verifications where place_id = coalesce(new.place_id, old.place_id))
   where id = coalesce(new.place_id, old.place_id);
  return null;
end $$;

drop trigger if exists place_verifications_sync on place_verifications;
create trigger place_verifications_sync
after insert or delete on place_verifications
for each row execute function sync_place_verified();

-- Markerer en referral som aktivert først når alle tre stegene er gjort.
create or replace function sync_referral_activation() returns trigger
language plpgsql as $$
begin
  if new.signed_up_at is not null
     and new.dog_added_at is not null
     and new.first_walk_at is not null
     and new.activated_at is null then
    new.activated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists referrals_activation on referrals;
create trigger referrals_activation
before insert or update on referrals
for each row execute function sync_referral_activation();

-- =============================================================================
-- 12. REFERANSEDATA
-- Kun ekte, offentlige data. Ingen demo-brukere, hunder eller innlegg
-- skal noen gang legges inn her.
-- =============================================================================

insert into counties (id, name) values
  ('oslo','Oslo'), ('akershus','Akershus'), ('ostfold','Østfold'),
  ('buskerud','Buskerud'), ('innlandet','Innlandet'), ('vestfold','Vestfold'),
  ('telemark','Telemark'), ('agder','Agder'), ('rogaland','Rogaland'),
  ('vestland','Vestland'), ('moreromsdal','Møre og Romsdal'),
  ('trondelag','Trøndelag'), ('nordland','Nordland'), ('troms','Troms'),
  ('finnmark','Finnmark')
on conflict (id) do nothing;

-- Kommunene fylles fra app/lib/geo.js (og verifiseres mot SSB) med et
-- eget importskript. Vi åpner community by for by ved å sette launched = true.

insert into badges (id, name, metric, target, icon, color) values
  ('first-walk','Første tur','total_walks',1,'paw','mint'),
  ('streak7','7 dager','streak',7,'flame','coral'),
  ('streak30','30 dager','streak',30,'flame','coral'),
  ('km100','100 km','total_km',100,'trophy','sun'),
  ('km500','500 km','total_km',500,'trophy','sun'),
  ('explorer','Utforsker','places_visited',10,'compass','mint'),
  ('morning','Morgenpote','morning_walks',5,'sun','sun'),
  ('night','Nattugle','night_walks',5,'moon','violet'),
  ('rain','Regnværskriger','rain_walks',5,'rain','violet'),
  ('social','Sosial snute','meetups_joined',3,'users','blue'),
  ('founder','Grunnlegger','founder',1,'star','sun')
on conflict (id) do nothing;

insert into challenges (id, scope, title, metric, target, unit, reward_paws) values
  ('daily-walk','daglig','Gå en tur på 20 minutter','today_minutes',20,'min',40),
  ('week-walks','ukentlig','Fem turer denne uka','week_walks',5,'turer',150),
  ('week-km','ukentlig','Gå 20 km denne uka','week_km',20,'km',200),
  ('new-places','ukentlig','Besøk tre nye turområder','new_places',3,'steder',180)
on conflict (id) do nothing;
