-- =============================================================================
-- Potesjarm – Sprint 4: ekte grupper (medlemskap, gruppefeed, gruppetreff,
-- moderering). Idempotent. Kjør i SQL Editor (ny, tom fane) etter 003.
--
-- Tabellene groups / group_members / posts (med group_id) / comments finnes
-- allerede i 001-skjemaet – her legges kun til meetups.group_id og sikre
-- RPC-er. RPC-ene er SECURITY DEFINER fordi RLS bare lar deg skrive din egen
-- medlemsrad og dine egne innlegg; moderering (fjern medlem, slett andres
-- innlegg) og membership-krav for innlegg må håndheves server-side.
-- =============================================================================

-- --- Treff kan tilhøre en gruppe --------------------------------------------
alter table meetups add column if not exists group_id uuid references groups(id) on delete set null;
create index if not exists meetups_group_idx on meetups(group_id) where cancelled_at is null;

-- --- Rolle-hjelper -----------------------------------------------------------
create or replace function group_role(p_group uuid, p_uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select role from group_members where group_id = p_group and profile_id = p_uid;
$$;

-- --- Opprett gruppe + oppretter som admin (atomisk) --------------------------
create or replace function create_group(p_name text, p_about text default null, p_kind text default 'lokalt', p_municipality text default null)
returns groups language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Gruppa må ha et navn'; end if;
  insert into groups (name, about, kind, municipality_id, created_by)
    values (trim(p_name), nullif(trim(coalesce(p_about, '')), ''),
            case when p_kind in ('rase','aktivitet','valp','lokalt','annet') then p_kind else 'lokalt' end,
            p_municipality, auth.uid())
    returning * into g;
  insert into group_members (group_id, profile_id, role) values (g.id, auth.uid(), 'admin')
    on conflict do nothing;
  return g;
end; $$;

-- --- Bli med / forlat (idempotent; sperrer siste admin fra å forlate) --------
create or replace function join_group(p_group uuid)
returns void language sql security definer set search_path = public as $$
  insert into group_members (group_id, profile_id, role) values (p_group, auth.uid(), 'member')
  on conflict (group_id, profile_id) do nothing;
$$;

create or replace function leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_admins int; v_members int;
begin
  v_role := group_role(p_group, auth.uid());
  if v_role is null then return; end if;               -- ikke medlem => no-op (idempotent)
  if v_role = 'admin' then
    select count(*) into v_admins from group_members where group_id = p_group and role = 'admin';
    select count(*) into v_members from group_members where group_id = p_group;
    if v_admins <= 1 and v_members > 1 then
      raise exception 'Overfør admin til noen andre før du forlater gruppa';
    end if;
  end if;
  delete from group_members where group_id = p_group and profile_id = auth.uid();
end; $$;

-- --- Grupper i en kommune (medlemstall + min rolle, uten N+1) ----------------
create or replace function group_summaries(p_municipality text)
returns table (id uuid, name text, about text, kind text, photo_url text,
               is_official boolean, municipality_id text, member_count int, my_role text)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.about, g.kind, g.photo_url, g.is_official, g.municipality_id,
    (select count(*)::int from group_members m where m.group_id = g.id) as member_count,
    (select role from group_members m where m.group_id = g.id and m.profile_id = auth.uid()) as my_role
  from groups g
  where g.municipality_id = p_municipality
  order by g.is_official desc,
    (select count(*) from group_members m where m.group_id = g.id) desc,
    g.created_at asc;
$$;

-- --- Medlemmer (rolle + primærhund + eiernavn), blokkerte skjult ------------
create or replace function list_group_members(p_group uuid)
returns table (profile_id uuid, role text, display_name text,
               dog_id uuid, dog_name text, dog_photo text, dog_breed text)
language sql stable security definer set search_path = public as $$
  select m.profile_id, m.role, p.display_name,
    d.id, d.name, d.photo_url, d.breed
  from group_members m
  join profiles p on p.id = m.profile_id
  left join lateral (
    select id, name, photo_url, breed from dogs where owner_id = m.profile_id
    order by created_at asc limit 1
  ) d on true
  where m.group_id = p_group
    and not is_blocked_between(auth.uid(), m.profile_id)
  order by case m.role when 'admin' then 0 when 'moderator' then 1 else 2 end, p.display_name;
$$;

-- --- Gruppefeed (nyeste først, blokkerte forfattere skjult) -----------------
create or replace function list_group_posts(p_group uuid, p_limit int default 30)
returns table (id uuid, author_id uuid, body text, photo_url text, created_at timestamptz,
               author_name text, dog_id uuid, dog_name text, dog_photo text)
language sql stable security definer set search_path = public as $$
  select po.id, po.author_id, po.body, po.photo_url, po.created_at,
    p.display_name, d.id, d.name, d.photo_url
  from posts po
  join profiles p on p.id = po.author_id
  left join lateral (select id, name, photo_url from dogs where id = po.dog_id) d on true
  where po.group_id = p_group
    and not is_blocked_between(auth.uid(), po.author_id)
  order by po.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- --- Lag innlegg i en gruppe (krever medlemskap) ----------------------------
create or replace function create_group_post(p_group uuid, p_body text, p_dog uuid default null, p_photo text default null)
returns posts language plpgsql security definer set search_path = public as $$
declare v posts; v_mun text;
begin
  if group_role(p_group, auth.uid()) is null then raise exception 'Bare medlemmer kan skrive i gruppa'; end if;
  if coalesce(trim(coalesce(p_body, '')), '') = '' and coalesce(p_photo, '') = '' then
    raise exception 'Tomt innlegg';
  end if;
  select municipality_id into v_mun from groups where id = p_group;
  insert into posts (author_id, dog_id, group_id, municipality_id, kind, body, photo_url)
    values (auth.uid(), p_dog, p_group, v_mun, 'text',
            nullif(trim(coalesce(p_body, '')), ''), nullif(p_photo, ''))
    returning * into v;
  return v;
end; $$;

-- --- Slett innlegg (forfatter ELLER admin/moderator i gruppa) ----------------
create or replace function delete_group_post(p_post uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_group uuid; v_author uuid; v_role text;
begin
  select group_id, author_id into v_group, v_author from posts where id = p_post;
  if not found then return; end if;
  v_role := group_role(v_group, auth.uid());
  if auth.uid() = v_author or v_role in ('admin','moderator') then
    delete from posts where id = p_post;
  else
    raise exception 'Ikke tillatt';
  end if;
end; $$;

-- --- Fjern medlem (admin/moderator; ikke siste admin) ------------------------
create or replace function remove_group_member(p_group uuid, p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_target text; v_admins int;
begin
  v_caller := group_role(p_group, auth.uid());
  v_target := group_role(p_group, p_profile);
  if v_caller not in ('admin','moderator') then raise exception 'Ikke tillatt'; end if;
  if v_target = 'admin' and v_caller <> 'admin' then raise exception 'Kan ikke fjerne en admin'; end if;
  if v_target = 'admin' then
    select count(*) into v_admins from group_members where group_id = p_group and role = 'admin';
    if v_admins <= 1 then raise exception 'Kan ikke fjerne siste admin'; end if;
  end if;
  delete from group_members where group_id = p_group and profile_id = p_profile;
end; $$;

-- --- Endre rolle (kun admin; behold minst én admin) --------------------------
create or replace function set_group_member_role(p_group uuid, p_profile uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admins int;
begin
  if group_role(p_group, auth.uid()) <> 'admin' then raise exception 'Ikke tillatt'; end if;
  if p_role not in ('member','moderator','admin') then raise exception 'Ugyldig rolle'; end if;
  if p_role <> 'admin' and group_role(p_group, p_profile) = 'admin' then
    select count(*) into v_admins from group_members where group_id = p_group and role = 'admin';
    if v_admins <= 1 then raise exception 'Gruppa må ha minst én admin'; end if;
  end if;
  update group_members set role = p_role where group_id = p_group and profile_id = p_profile;
end; $$;

-- --- Gruppetreff (aktive, tidligst først) -----------------------------------
create or replace function list_group_meetups(p_group uuid)
returns setof meetups language sql stable security definer set search_path = public as $$
  select * from meetups
  where group_id = p_group and cancelled_at is null and expires_at > now()
  order by starts_at asc;
$$;
