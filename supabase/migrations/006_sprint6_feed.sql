-- =============================================================================
-- Potesjarm – Sprint 6: ekte feed (innlegg + likes + kommentarer + saves)
--
-- Idempotent. Kjør i SQL Editor. Bygger på 001-skjemaet: `posts`, `post_likes`,
-- `comments`, `saved_posts` og `follows` finnes fra før. Ingen nye tabeller –
-- her legges til:
--   * indekser for feed-spørringer
--   * en berikelses-VIEW `post_card` (forfatter/hund/gruppe + ekte counts +
--     liked_by_me / saved_by_me) som ALLE feed-RPC-ene deler
--   * SECURITY DEFINER-RPC-er for feed, saves, kommentarer, likes og mutasjoner
--
-- Sikkerhet (samme mønster som 003–005): all lesing som må kjenne blokkering
-- eller gruppemedlemskap går gjennom SECURITY DEFINER-funksjoner. Klienten
-- leser aldri `posts` direkte for feeden; den kaller RPC-ene via
-- app/lib/db/feed.js. Blokkering håndheves i begge retninger
-- (is_blocked_between), gruppeinnlegg krever medlemskap.
-- =============================================================================

-- --- 1. Indekser for feed-spørringer -----------------------------------------
create index if not exists posts_author_created_idx on posts(author_id, created_at desc);
create index if not exists posts_dog_created_idx    on posts(dog_id, created_at desc);
create index if not exists saved_posts_profile_idx  on saved_posts(profile_id, created_at desc);

-- --- 2. Berikelses-view (delt av alle feed-RPC-er) ---------------------------
-- Ekte counts og min egen liked/saved-status. auth.uid() evalueres for den som
-- kjører spørringen (også inne i SECURITY DEFINER-RPC-ene under). Ingen fake
-- tall: mangler noe, blir det 0/false.
create or replace view post_card as
select
  po.id, po.author_id, po.dog_id, po.group_id, po.municipality_id,
  po.kind, po.body, po.photo_url, po.place_id, po.created_at,
  pr.display_name as author_name,
  pr.avatar_url   as author_avatar,
  pr.suspended_at as author_suspended,
  d.name       as dog_name,
  d.photo_url  as dog_photo,
  g.name       as group_name,
  (select count(*) from post_likes pl where pl.post_id = po.id) as likes_count,
  (select count(*) from comments  cm where cm.post_id = po.id) as comments_count,
  exists (select 1 from post_likes  pl where pl.post_id = po.id and pl.profile_id = auth.uid()) as liked_by_me,
  exists (select 1 from saved_posts sp where sp.post_id = po.id and sp.profile_id = auth.uid()) as saved_by_me
from posts po
join profiles pr on pr.id = po.author_id
left join dogs   d on d.id = po.dog_id
left join groups g on g.id = po.group_id;

-- --- 3. RPC: hjem-feed (MVP-relevans + cursor) -------------------------------
-- Relevans: egne innlegg, gruppeinnlegg i grupper jeg er medlem av, og ellers
-- innlegg fra hunder jeg følger eller lokale innlegg i kommunen. Gruppeinnlegg
-- lekker ALDRI ut til ikke-medlemmer (kun via medlemskap). Blokkerte og
-- suspenderte forfattere skjules. Sortert nyeste først; cursor = created_at.
create or replace function list_feed(p_municipality text, p_limit int default 25, p_before timestamptz default null)
returns setof post_card
language sql stable security definer set search_path = public
as $$
  select pc.* from post_card pc
  where (p_before is null or pc.created_at < p_before)
    and pc.author_suspended is null
    and not is_blocked_between(auth.uid(), pc.author_id)
    and (
      pc.author_id = auth.uid()
      or (pc.group_id is not null
          and pc.group_id in (select group_id from group_members where profile_id = auth.uid()))
      or (pc.group_id is null and (
            pc.dog_id in (select dog_id from follows where follower_id = auth.uid())
            or pc.municipality_id = p_municipality))
    )
  order by pc.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

-- --- 4. RPC: lagrede innlegg --------------------------------------------------
create or replace function list_saved_posts(p_limit int default 25, p_before timestamptz default null)
returns setof post_card
language sql stable security definer set search_path = public
as $$
  select pc.* from post_card pc
  join saved_posts sp on sp.post_id = pc.id and sp.profile_id = auth.uid()
  where (p_before is null or pc.created_at < p_before)
    and not is_blocked_between(auth.uid(), pc.author_id)
  order by pc.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

-- --- 5. RPC: gruppefeed (erstatter Sprint 4-varianten, nå med counts) --------
-- Samme berikede form som hjem-feeden, så gruppefeed og hjem-feed deler mapper
-- og PostCard. Blokkerte forfattere skjult.
-- Sprint 4 hadde en 2-arg-variant med en annen retur-type; den må slippes
-- først (create or replace kan ikke endre retur-typen, og en ny signatur ville
-- bare lagt til et tvetydig overlast).
drop function if exists list_group_posts(uuid, int);
create or replace function list_group_posts(p_group uuid, p_limit int default 30, p_before timestamptz default null)
returns setof post_card
language sql stable security definer set search_path = public
as $$
  select pc.* from post_card pc
  where pc.group_id = p_group
    and (p_before is null or pc.created_at < p_before)
    and not is_blocked_between(auth.uid(), pc.author_id)
  order by pc.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- --- 6. RPC: ett enkelt innlegg (for oppfrisk etter mutasjon) ----------------
create or replace function feed_post(p_post uuid)
returns setof post_card
language sql stable security definer set search_path = public
as $$
  select pc.* from post_card pc
  where pc.id = p_post
    and not is_blocked_between(auth.uid(), pc.author_id)
  limit 1;
$$;

-- --- 7. RPC: lag innlegg -----------------------------------------------------
-- author = auth.uid(). body eller bilde må finnes. Egen hund kreves hvis oppgitt.
-- Gruppeinnlegg krever medlemskap; kommune settes fra gruppa, ellers fra
-- parameter/profil. Returnerer innleggets id.
create or replace function create_post(
  p_body text default null,
  p_dog uuid default null,
  p_group uuid default null,
  p_photo text default null,
  p_kind text default null,
  p_municipality text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_photo text := nullif(p_photo, '');
  v_kind text;
  v_mun text;
  v_id uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  if v_body is null and v_photo is null then raise exception 'Tomt innlegg'; end if;
  if p_dog is not null and not exists (
    select 1 from dogs where id = p_dog and owner_id = v_me
  ) then raise exception 'Ikke din hund'; end if;

  v_kind := coalesce(nullif(p_kind, ''), case when v_photo is not null then 'photo' else 'text' end);
  if v_kind not in ('photo','walk','question','text') then v_kind := 'text'; end if;

  if p_group is not null then
    if group_role(p_group, v_me) is null then raise exception 'Bare medlemmer kan skrive i gruppa'; end if;
    select municipality_id into v_mun from groups where id = p_group;
  else
    v_mun := coalesce(p_municipality, (select municipality_id from profiles where id = v_me));
  end if;

  insert into posts (author_id, dog_id, group_id, municipality_id, kind, body, photo_url)
    values (v_me, p_dog, p_group, v_mun, v_kind, v_body, v_photo)
    returning id into v_id;
  return v_id;
end;
$$;

-- --- 8. RPC: slett innlegg (forfatter, eller gruppeadmin/moderator) ----------
create or replace function delete_post(p_post uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_author uuid; v_group uuid;
begin
  select author_id, group_id into v_author, v_group from posts where id = p_post;
  if not found then return; end if;
  if auth.uid() = v_author
     or (v_group is not null and group_role(v_group, auth.uid()) in ('admin','moderator')) then
    delete from posts where id = p_post;
  else
    raise exception 'Ikke tillatt';
  end if;
end;
$$;

-- --- 9. RPC: like / unlike (idempotent, blokk- og medlemskaps-bevisst) -------
create or replace function like_post(p_post uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_me uuid := auth.uid(); v_author uuid; v_group uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  select author_id, group_id into v_author, v_group from posts where id = p_post;
  if not found then raise exception 'No such post'; end if;
  if is_blocked_between(v_me, v_author) then raise exception 'Blocked'; end if;
  if v_group is not null and group_role(v_group, v_me) is null then raise exception 'Bare medlemmer'; end if;
  insert into post_likes (post_id, profile_id) values (p_post, v_me) on conflict do nothing;
  return (select count(*) from post_likes where post_id = p_post);
end;
$$;

create or replace function unlike_post(p_post uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  delete from post_likes where post_id = p_post and profile_id = v_me;
  return (select count(*) from post_likes where post_id = p_post);
end;
$$;

-- --- 10. RPC: lagre / fjern lagring (idempotent) -----------------------------
create or replace function save_post(p_post uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_me uuid := auth.uid(); v_author uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  select author_id into v_author from posts where id = p_post;
  if not found then raise exception 'No such post'; end if;
  if is_blocked_between(v_me, v_author) then raise exception 'Blocked'; end if;
  insert into saved_posts (profile_id, post_id) values (v_me, p_post) on conflict do nothing;
end;
$$;

create or replace function unsave_post(p_post uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from saved_posts where post_id = p_post and profile_id = auth.uid();
end;
$$;

-- --- 11. RPC: kommentarer -----------------------------------------------------
-- Liste (blokkerte forfattere skjult), hunden er forfatterens primærhund.
create or replace function list_post_comments(p_post uuid)
returns table (
  id uuid, author_id uuid, body text, created_at timestamptz,
  author_name text, author_avatar text,
  dog_id uuid, dog_name text, dog_photo text, is_mine boolean
)
language sql stable security definer set search_path = public
as $$
  select cm.id, cm.author_id, cm.body, cm.created_at,
    pr.display_name, pr.avatar_url,
    d.id, d.name, d.photo_url,
    (cm.author_id = auth.uid())
  from comments cm
  join profiles pr on pr.id = cm.author_id
  left join lateral (
    select id, name, photo_url from dogs where owner_id = cm.author_id order by created_at asc limit 1
  ) d on true
  where cm.post_id = p_post
    and not is_blocked_between(auth.uid(), cm.author_id)
  order by cm.created_at asc;
$$;

-- Lag kommentar. Blokk- og medlemskaps-bevisst. Returnerer kommentarens id.
create or replace function create_comment(p_post uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_author uuid; v_group uuid; v_id uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  if v_body is null then raise exception 'Tom kommentar'; end if;
  select author_id, group_id into v_author, v_group from posts where id = p_post;
  if not found then raise exception 'No such post'; end if;
  if is_blocked_between(v_me, v_author) then raise exception 'Blocked'; end if;
  if v_group is not null and group_role(v_group, v_me) is null then raise exception 'Bare medlemmer'; end if;
  insert into comments (post_id, author_id, body) values (p_post, v_me, v_body) returning id into v_id;
  return v_id;
end;
$$;

-- Slett kommentar (forfatter, eller gruppeadmin/moderator på gruppeinnlegg).
create or replace function delete_comment(p_comment uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_author uuid; v_group uuid;
begin
  select c.author_id, p.group_id into v_author, v_group
    from comments c join posts p on p.id = c.post_id
    where c.id = p_comment;
  if not found then return; end if;
  if auth.uid() = v_author
     or (v_group is not null and group_role(v_group, auth.uid()) in ('admin','moderator')) then
    delete from comments where id = p_comment;
  else
    raise exception 'Ikke tillatt';
  end if;
end;
$$;
