-- Potesjarm community data model (prepared for Supabase)
-- Not applied automatically. Keeps SiamConnect untouched.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  breed text,
  birth_date date,
  sex text check (sex in ('male','female','unknown')),
  avatar_url text,
  energy_level int check (energy_level between 1 and 5),
  play_style text[],
  likes text[],
  city text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  body text,
  media_url text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  signal_type text not null check (signal_type in ('walk','play','question','help','event')),
  title text not null,
  body text,
  city text not null,
  neighborhood text,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz,
  expires_at timestamptz not null default (now() + interval '6 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.signal_participants (
  signal_id uuid references public.signals(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested','going')),
  created_at timestamptz not null default now(),
  primary key(signal_id,user_id)
);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  city text,
  category text,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid references public.circles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check(role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  primary key(circle_id,user_id)
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,dog_id)
);

create table if not exists public.walks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_m integer not null default 0,
  duration_s integer not null default 0,
  elevation_m integer not null default 0,
  steps integer not null default 0,
  city text,
  route_geojson jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  city text,
  metric text not null check(metric in ('distance','walks','streak','places','elevation')),
  target numeric not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  badge_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_progress (
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  progress numeric not null default 0,
  completed_at timestamptz,
  primary key(challenge_id,user_id)
);

create table if not exists public.badges (
  key text primary key,
  name text not null,
  description text,
  icon text,
  category text
);

create table if not exists public.user_badges (
  user_id uuid references public.profiles(id) on delete cascade,
  badge_key text references public.badges(key) on delete cascade,
  dog_id uuid references public.dogs(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(user_id,badge_key,dog_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_city_expires on public.signals(city,expires_at desc);
create index if not exists idx_posts_city_created on public.posts(city,created_at desc);
create index if not exists idx_walks_user_started on public.walks(user_id,started_at desc);
create index if not exists idx_dogs_city on public.dogs(city) where is_public = true;

alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.signals enable row level security;
alter table public.signal_participants enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.follows enable row level security;
alter table public.walks enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_owner_write" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "dogs_public_read" on public.dogs for select using (is_public or owner_id = auth.uid());
create policy "dogs_owner_write" on public.dogs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "posts_public_read" on public.posts for select using (true);
create policy "posts_owner_insert" on public.posts for insert with check (author_id = auth.uid());
create policy "posts_owner_modify" on public.posts for update using (author_id = auth.uid());
create policy "posts_owner_delete" on public.posts for delete using (author_id = auth.uid());
create policy "likes_public_read" on public.post_likes for select using (true);
create policy "likes_self_write" on public.post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "comments_public_read" on public.comments for select using (true);
create policy "comments_self_write" on public.comments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "signals_public_read" on public.signals for select using (expires_at > now());
create policy "signals_self_write" on public.signals for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "signal_participants_public_read" on public.signal_participants for select using (true);
create policy "signal_participants_self_write" on public.signal_participants for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "circles_public_read" on public.circles for select using (not is_private or exists(select 1 from public.circle_members cm where cm.circle_id=id and cm.user_id=auth.uid()));
create policy "circle_members_public_read" on public.circle_members for select using (true);
create policy "circle_members_self_write" on public.circle_members for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "follows_public_read" on public.follows for select using (true);
create policy "follows_self_write" on public.follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy "walks_owner_only" on public.walks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "challenges_public_read" on public.challenges for select using (true);
create policy "challenge_progress_self" on public.challenge_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "badges_public_read" on public.badges for select using (true);
create policy "user_badges_public_read" on public.user_badges for select using (true);
create policy "notifications_owner_only" on public.notifications for select using (user_id = auth.uid());
