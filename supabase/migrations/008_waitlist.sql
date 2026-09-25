-- =============================================================================
-- Potesjarm – venteliste med referral, UTM-sporing og Founder-plass
--
-- Idempotent, additiv. Kjør i SQL Editor. Rører ingen eksisterende app-tabeller
-- bortsett fra en liten trigger på profiles (setter is_founder, kolonnen finnes
-- fra før).
--
-- Personvern: tabellen har RLS PÅ og INGEN policies – ingen klient kan lese
-- eller skrive direkte. Eneste vei inn er RPC-en join_waitlist (SECURITY
-- DEFINER), som bare returnerer det den som melder seg på trenger: egen
-- referral-kode og egen plass i køen i sin by.
--
-- «Hund #37 i Stavanger» er ekte: plassen regnes ut ved innsetting under en
-- advisory-lås per by, så to samtidige påmeldinger aldri får samme nummer.
-- De første 100 i hver by merkes founder = true.
-- =============================================================================

create table if not exists waitlist_signups (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  dog_name      text not null,
  city          text not null,              -- visningsnavn («Stavanger»)
  city_key      text not null,              -- normalisert nøkkel («stavanger»)
  position      integer not null,           -- ekte plass i køen i byen
  founder       boolean not null default false,
  referral_code text not null,
  referred_by   uuid references waitlist_signups(id) on delete set null,
  signup_source text,                        -- hvor på siden (hero / bunn)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  referrer      text,                        -- document.referrer ved første besøk
  landing_path  text,
  created_at    timestamptz not null default now()
);
create unique index if not exists waitlist_signups_email_uidx on waitlist_signups (lower(email));
create unique index if not exists waitlist_signups_code_uidx  on waitlist_signups (referral_code);
create index        if not exists waitlist_signups_city_idx   on waitlist_signups (city_key, position);
create index        if not exists waitlist_signups_utm_idx    on waitlist_signups (utm_source, utm_campaign);

alter table waitlist_signups enable row level security;
-- Bevisst ingen policies: kun RPC-en under har tilgang.

-- Kort, lesbar kode uten forvekslingstegn (ingen 0/O/1/l/I).
create or replace function _waitlist_code()
returns text language sql volatile as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (1 + floor(random() * 31))::int, 1), '')
  from generate_series(1, 7);
$$;

create or replace function join_waitlist(
  p_email text,
  p_dog_name text,
  p_city text,
  p_ref text default null,
  p_source text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_referrer text default null,
  p_landing_path text default null
)
returns table (status text, referral_code text, city text, "position" integer, founder boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_dog   text := btrim(coalesce(p_dog_name, ''));
  v_city  text := btrim(coalesce(p_city, ''));
  v_key   text;
  v_row   waitlist_signups;
  v_ref   uuid;
  v_code  text;
  v_pos   integer;
  i       integer := 0;
begin
  -- Validering (speiles i klienten, men serveren er fasit).
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if v_dog = '' or length(v_dog) > 40 then raise exception 'invalid_dog' using errcode = '22023'; end if;
  if v_city = '' or length(v_city) > 60 then raise exception 'invalid_city' using errcode = '22023'; end if;
  v_key := lower(v_city);

  -- Allerede på lista: gi tilbake egen kode/plass, ikke noe om andre.
  select * into v_row from waitlist_signups w where lower(w.email) = v_email;
  if found then
    return query select 'duplicate'::text, v_row.referral_code, v_row.city, v_row.position, v_row.founder;
    return;
  end if;

  -- Hvem inviterte? (ukjent kode ignoreres stille)
  if p_ref is not null and p_ref <> '' then
    select w.id into v_ref from waitlist_signups w where w.referral_code = lower(btrim(p_ref));
  end if;

  -- Ekte, unik plass per by.
  perform pg_advisory_xact_lock(hashtext('waitlist:' || v_key));
  select coalesce(max(w.position), 0) + 1 into v_pos from waitlist_signups w where w.city_key = v_key;

  loop
    v_code := _waitlist_code();
    exit when not exists (select 1 from waitlist_signups w where w.referral_code = v_code);
    i := i + 1;
    if i > 10 then raise exception 'code_generation_failed'; end if;
  end loop;

  begin
    insert into waitlist_signups (
      email, dog_name, city, city_key, position, founder, referral_code, referred_by,
      signup_source, utm_source, utm_medium, utm_campaign, utm_content, referrer, landing_path
    ) values (
      v_email, v_dog, v_city, v_key, v_pos, v_pos <= 100, v_code, v_ref,
      left(p_source, 40), left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 150),
      left(p_utm_content, 150), left(p_referrer, 300), left(p_landing_path, 300)
    ) returning * into v_row;
  exception when unique_violation then
    -- Samtidig dobbel innsending av samme e-post.
    select * into v_row from waitlist_signups w where lower(w.email) = v_email;
    return query select 'duplicate'::text, v_row.referral_code, v_row.city, v_row.position, v_row.founder;
    return;
  end;

  return query select 'created'::text, v_row.referral_code, v_row.city, v_row.position, v_row.founder;
end;
$$;

-- Ventelista er offentlig påmelding: anon (ikke innlogget) må kunne kalle RPC-en.
grant execute on function join_waitlist(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- Founder-løftet holdes: når en som var blant de første 100 i sin by lager
-- konto med samme e-post, settes profiles.is_founder automatisk.
create or replace function trg_mark_founder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from waitlist_signups w
    join auth.users u on lower(u.email) = lower(w.email)
    where u.id = NEW.id and w.founder
  ) then
    NEW.is_founder := true;
  end if;
  return NEW;
end; $$;
drop trigger if exists mark_founder on profiles;
create trigger mark_founder before insert on profiles
  for each row execute function trg_mark_founder();

-- Nyttig spørring for oppfølging (kjør selv i SQL Editor):
--   select utm_source, utm_campaign, count(*) from waitlist_signups group by 1,2 order by 3 desc;
--   select city, count(*) from waitlist_signups group by 1 order by 2 desc;
--   select r.referral_code, count(s.*) from waitlist_signups r join waitlist_signups s on s.referred_by = r.id group by 1 order by 2 desc;
