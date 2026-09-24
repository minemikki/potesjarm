# CLAUDE HANDOVER — Potesjarm Community

## What this is
Potesjarm is being rebuilt from a simple dog site into a **Norwegian local dog-owner community app**.

Core positioning:
- Local-first, city-based
- Social dog profiles
- Meetups / walks
- Activity tracking + streaks + badges
- Local discovery
- Events
- Safety / lost dog
- Community feed

The visual direction the user approved is **NOT generic SaaS / dashboard UI**. It should feel like a real consumer social app with a strong brand identity.

## Current branch
Work only on:
`gpt/community-mvp`

Do **NOT** merge to `main` without user approval.

Preview:
https://potesjarm-git-gpt-community-mvp-minemikkis-projects.vercel.app

Repo:
https://github.com/minemikki/potesjarm

## Important product direction
The user specifically disliked the terminology:
- "Signals"
- "Circles"
- "Send signal"

These were replaced with:
- **Nå skjer**
- **Grupper**
- **Lag treff**

Keep this language unless the user explicitly changes it.

Preferred nav naming:
- For deg
- Nå skjer
- Grupper
- Hunder
- Kart
- Aktivitet
- Arrangementer
- Utforsk

## Approved visual direction
The user preferred the second of three visual concepts generated previously.

Identity:
- Deep indigo / cobalt sidebar
- Cream / warm white canvas
- Bright blue primary CTA
- Mint / coral pastel support cards
- Rounded, playful typography
- Strong dog photography
- Handwritten microcopy used sparingly
- Social, warm, local
- Compact content density
- Avoid generic AI-card-grid feel
- Avoid excessive gray/empty space
- Avoid dark gaming feel
- Avoid enterprise SaaS look
- Avoid overly polished generic "AI startup" dashboard

The homepage should feel closer to:
Instagram + Strava + local dog community
rather than:
admin dashboard / booking SaaS

User likes:
- colorful story/avatar rings
- real dog photography
- rounded cards
- strong hero
- playful handwritten annotations
- visible activity from real local people/dogs
- dense but clean social content

## Latest major sidebar decision
The left sidebar was structurally rebuilt because it kept clipping on the user's desktop height.

Current sidebar architecture:
1. Top:
   - Potesjarm logo
   - short handwritten brand line
   - city selector
2. Middle:
   - section: FELLESSKAP
   - For deg
   - Nå skjer
   - Grupper
   - Hunder
   - section: UTFORSK
   - Kart
   - Aktivitet
   - Arrangementer
   - Utforsk
3. Bottom:
   - Lag treff CTA
   - compact utility buttons:
     - invite
     - safety
     - settings
   - user/profile card

The sidebar must:
- run from top to bottom of viewport
- NOT clip bottom items
- NOT look like a floating short card
- remain usable on laptop-height screens
- use compact responsive height rules rather than hide core nav

The latest implementation added:
- fixed 3-zone CSS grid structure
- compact mode for max-height 820px
- extra compact mode for max-height 720px

Please inspect and improve this rather than reverting it.

## Current homepage structure
Top:
- "LOKALT HUNDEFELLESSKAP"
- "God morgen, Stavanger"
- search / inbox / notifications
- large hero:
  "Finn noen å gå tur med i dag?"
  CTA: "Lag treff"
  CTA: "Åpne kart"

Hero currently includes:
- large dog photo
- active dog-owner avatar cluster
- handwritten "Bedre turer sammen ♡"

Then:
- Hundevenner i nærheten
- circular dog avatars / mini stories
- status strip:
  - turstreak
  - local arrangements
- community feed
- "Nå skjer" local meetups

The user wants this to feel more like the approved concept image and less like a SaaS dashboard.

## Features already implemented in prototype
### Social
- For deg feed
- posts
- likes
- comments
- save post
- share demo
- report/block action sheet
- stories / moments
- dog profiles
- follow dogs
- dog matching
- inbox
- chat
- notifications
- search

### Local
- city picker
- Stavanger / Sandnes / Bergen / Oslo / Trondheim / Kristiansand demo
- local "Nå skjer"
- local events / arrangements
- local nearby dogs
- map prototype

### Community
- Grupper
- join group
- meetups / "Lag treff"
- create event
- join event
- invite friends

### Activity / Gamification
- walk mode
- distance/time/paws demo
- streak
- badges
- challenges
- leaderboard
- activity page
- weekly recap/share card

### Discovery
- places
- dog parks
- routes
- dog-friendly locations
- saved places
- saved routes

### Safety
- emergency profile preview
- profile verification demo
- lost dog alert
- report / block
- privacy settings

### Monetization preview
- Potesjarm+ preview
- no payment connection yet

## Backend
A Supabase schema was prepared in:
`supabase/schema.sql`

It includes:
- profiles
- dogs
- posts
- likes
- comments
- signals/meetups
- participants
- circles/groups
- follows
- walks
- challenges
- progress
- badges
- notifications
- RLS policies

IMPORTANT:
The existing Potesjarm Supabase project is currently inactive.
Restore attempt failed due unpaid invoices on the Supabase organization.

Do NOT touch SiamConnect Supabase.
Do NOT connect Potesjarm to SiamConnect.

For now the app uses demo arrays + localStorage.

## Technical stack
- Next.js App Router
- React
- CSS in `app/globals.css`
- main screen currently in `app/page.js`
- Vercel branch previews

There is a lot of prototype logic in one file.
A future cleanup should split:
- Sidebar
- HomeFeed
- Meetups
- Groups
- Dogs
- Explore
- Activity
- Events
- Modals
- WalkTracker
into separate components.

Do not refactor destructively until visual behavior is stable.

## Current known issues / next priorities
### 1. Sidebar
Inspect the rebuilt sidebar first.
The user is extremely sensitive to:
- clipped navigation
- missing bottom content
- sidebar not filling viewport
- misaligned bottom CTA/profile

Make it visually complete and stable before moving on.

### 2. Homepage visual hierarchy
Improve:
- spacing
- typography
- social density
- feed cards
- story row
- local event card styling
- right sidebar balance

The approved direction should feel more alive and consumer-social.

### 3. Replace awkward icon glyphs
Some current icons are Unicode symbols.
Use a consistent icon set or clean inline SVGs.
Avoid "AI mockup icon soup".

### 4. Better responsive behavior
Test especially:
- 1366×768
- 1536×864
- 1920×1080
- mobile 390px

The user screenshots from Windows desktop/laptop.
Do not design only for huge screens.

### 5. Better Norwegian microcopy
Keep language natural and simple.
Avoid English UI terms when unnecessary.
Examples:
- "Arrangementer" instead of "Events"
- "Nå skjer"
- "Lag treff"
- "Hundevenner i nærheten"
- "Aktivitet i nærheten"

### 6. Stronger identity
Continue building visual identity around:
- indigo / cobalt
- warm cream
- coral
- mint
- sun yellow
- dog photos
- rounded playful headers
- occasional handwritten phrases

Do not overuse handwritten text.

### 7. Later backend
Once Supabase billing is fixed:
- wire auth
- live posts
- meetups
- chat
- follows
- groups
- walk history
- notifications
- image uploads
- realtime

## User working style
Very important:
- User wants execution, not constant approval checkpoints.
- Keep building through milestones unless blocked by cost, credentials, irreversible action, or a major product decision.
- Do not stop after every small milestone.
- User prefers seeing actual preview changes.
- User gets frustrated when design drifts from approved reference.
- If user says "bygg", build directly.

## Non-negotiable
- Do not touch SiamConnect DB
- Do not merge to main without approval
- Keep work on `gpt/community-mvp`
- Preserve the current community direction
- Keep Norwegian UI
- Keep terminology "Nå skjer / Grupper / Lag treff"
- Avoid generic SaaS / AI-slop styling
- Preserve the approved playful visual direction

## Suggested next build sequence
1. Verify sidebar visually at laptop height.
2. Polish full homepage to match approved concept.
3. Replace weak icons with a consistent set.
4. Add richer social feed cards / community activity.
5. Improve "Nå skjer" UX:
   - categories
   - distance
   - time
   - join state
   - meetup detail drawer
6. Improve dog profile:
   - compatibility
   - energy
   - play style
   - mutual groups
   - recent walks
7. Improve group pages:
   - group header
   - members
   - feed
   - upcoming meetups
8. Improve event detail page.
9. Improve mobile shell and bottom nav.
10. Then backend integration after Supabase is available.

## Current user expectation
The user has now explicitly asked Claude to continue from here.
Please continue building aggressively without waiting for approval on every milestone.
