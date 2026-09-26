# Potesjarm – Moderering (pilot)

Ingen moderator-dashboard for pilot. All moderering gjøres av en operatør i
**Supabase SQL Editor** via de sikre RPC-ene fra migrasjon 012. Moderatorrolle
kommer **kun** fra `moderators`-tabellen (server-side). Det finnes ingen
klient-side admin-flag og ingen self-claim.

> Alle RPC-ene under sjekker `is_moderator()` server-side og feiler med
> `not_moderator` hvis du ikke er i `moderators`. Kjør dem som en innlogget
> moderator (SQL Editor kjører som prosjekt-eier, som også slipper gjennom
> siden funksjonene er SECURITY DEFINER og eier alltid har tilgang).

## 1. Legge til en moderator
Finn brukerens uid i **Authentication → Users** (kolonnen `UID`), så:
```sql
insert into moderators (profile_id) values ('<AUTH_USER_UID>')
on conflict do nothing;
```

## 2. Fjerne en moderator
```sql
delete from moderators where profile_id = '<AUTH_USER_UID>';
```
Se hvem som er moderatorer:
```sql
select m.profile_id, p.display_name, m.added_at
from moderators m left join profiles p on p.id = m.profile_id
order by m.added_at;
```

## 3. Se ventende stedsforslag
```sql
select * from list_pending_places();
```
Returnerer alle `places` med `status='pending'` (eldste først).

## 4. Godkjenn / avvis et sted
```sql
select moderate_place('<PLACE_ID>', true);   -- godkjenn (blir synlig på kartet)
select moderate_place('<PLACE_ID>', false);  -- avvis (skjules)
```

## 5. Se åpne rapporter
```sql
select * from list_open_reports();   -- status open + reviewing, eldste først
```
Kolonner av interesse: `target_table`, `target_id`, `reason`, `details`,
`reporter_id`, `status`, `created_at`. Slå opp innholdet det gjelder med en
vanlig select på `target_table`/`target_id` (som eier ser du alt).

## 6. Sett rapportstatus (review / action / dismiss)
```sql
select mark_report('<REPORT_ID>', 'reviewing');
select mark_report('<REPORT_ID>', 'actioned');
select mark_report('<REPORT_ID>', 'dismissed');
```

## 7. Skjul / vis innhold
```sql
select moderate_hide('post',    '<POST_ID>',    true);   -- skjul innlegg
select moderate_hide('post',    '<POST_ID>',    false);  -- vis igjen
select moderate_hide('comment', '<COMMENT_ID>', true);   -- skjul kommentar
```
Skjult innhold (`hidden_at` satt) forsvinner fra feed/kommentarer for alle andre
enn forfatteren selv og moderatorer (RLS fra migrasjon 012).

## Typisk flyt for en rapport
1. `select * from list_open_reports();`
2. Slå opp innholdet (`target_table`/`target_id`).
3. Ved brudd: `moderate_hide(...)` for å skjule, evt. suspender bruker
   (`update profiles set suspended_at = now() where id = '<uid>'` – kun operatør).
4. `mark_report('<id>','actioned')` (eller `dismissed`).

## Suspendere en bruker (hardt tiltak, operatør)
```sql
update profiles set suspended_at = now() where id = '<AUTH_USER_UID>';   -- suspender
update profiles set suspended_at = null   where id = '<AUTH_USER_UID>';   -- opphev
```
Suspenderte brukere telles ikke i topplista (`local_leaderboard` filtrerer
`suspended_at is null`). Full håndheving av suspensjon i alle flater er en
post-pilot-oppgave.
