# MySkate roadmap

Source of truth for scope. Update it when a decision changes, and note the change in `LOG.md`.

## Principles

- Local-first: data stays on the device. JSON backup and restore protect it. No server.
- Phone first at the rink (one-handed, big tap targets). Desktop adds roomier planning and review.
- Fun but honest: XP, streaks, and glow make it a pleasure to open. Ratings are self-scored, so XP leans on time, consistency, and improvement.
- Every feature is small, working, and checked in a browser before it counts.

## Scope

### Must ship by Sunday 2026-10-18

- [ ] Catalog data files: Learn to Skate USA Basic 1-6, Pre-Free Skate and Free Skate 1-6, Adult 1-6, U.S. Figure Skating Skating Skills tests, and a jump/spin/other library
- [ ] Level picker, separate for skating skills and free skate (owner starts at Pre-Free Skate), with suggested next skills
- [ ] Plan screen: pick skills, pick an ice slot (30, 45, 60, 75, 90, 120 minutes, or custom)
- [ ] Skate mode: booked-slot countdown, actual on-ice timer with pause, skill checklist, 1-5 skate rating, notes, and a landed/missed counter for jumps
- [ ] History and progress: per-skill trend, level progress, ice time totals by week and month
- [ ] XP, level bar, and weekly streak
- [ ] Backup: export JSON (full), export CSV (read-only), restore with Merge or Replace, reminder after 7 days without a backup
- [ ] Deployed on GitHub Pages, Portfolio card filled in, `CLAUDE.md` and `LOG.md` current
- [ ] Placeholder panels where the 3D reference will go (Skate screen, Skill detail)

### Stretch, in this order

1. Time-budget planner: split the booked slot across the chosen skills
2. Friend cards and a local friends board
3. Blade hours since last sharpening (reuses logged on-ice time)
4. Cost per session and per month
5. Send plan to phone (link or QR code)
6. Test readiness against the 2026-27 Singles chart
7. Passphrase-protected backups (Web Crypto, AES-GCM)

### Later

- Skater customizer (stretch of the stretch): colors first, drawn in 2D, same settings reused on the 3D figure later. Default look is leggings and a top. A dress is an option, not the default. Cosmetics unlock with XP levels and badges.
- 3D reference viewer: Three.js mannequin with drag to rotate, pinch to zoom, camera presets (front, side, back, top), and play/pause keyframed poses stored as data. Poses are hand-built approximations and need the skater's review, labelled "reference illustration, not coaching". A slider-based pose editor could let a skater or coach author correct poses.
- Accounts, cloud sync, and a live leaderboard through a hosted free tier (Supabase or Firebase). MongoDB Atlas would need a serverless function in between, because a browser cannot talk to it directly and Atlas's Data API shut down on 2025-09-30. Free-tier limits are not verified.
- Coach notes and homework, personal cue notes per skill, goals with target dates, off-ice training log.

## Feature notes

### XP

| Action | XP |
|---|---|
| Log a session | +20 |
| Each minute on ice | +1 |
| Each skill practiced in a session | +5 |
| New personal best rating on a skill | +10 |
| First time reaching 4 skates / 5 skates on a skill | +25 / +50 (once per skill) |
| Weekly streak (two or more sessions in a week, consecutive weeks) | +30 |

Level n to n+1 costs `100 + 50 * (n - 1)` XP. XP is effort relative to your own level, so friends at different levels can compare fairly. A separate bar shows curriculum progress (for example "3 of 7 skills at 4+").

### Ice time

- Booked slot presets: 30, 45, 60, 75, 90, 120 minutes, plus custom.
- The on-ice timer stores start and pause timestamps and computes elapsed time from them. It survives a locked phone or a refresh, because background tabs throttle ticking timers.
- Optional screen wake lock while a session is running.

### Backup and restore

- Browser storage is the working copy, not the only copy. Ask the browser for persistent storage and suggest adding the app to the Home Screen. Safari may clear storage for sites not visited for about 7 days (not verified here).
- JSON is the canonical backup. CSV is a one-way export for spreadsheets or coaches. An HTML or image report is for sharing.
- Restore reads the chosen file on the device; nothing is uploaded. Show a preview ("14 sessions, Oct 1 to Oct 12"), then Merge or Replace. Merge matches sessions by id, so an old backup never wipes newer data or duplicates sessions.
- iPhone flow: export through the share sheet to Files or iCloud Drive; restore picks the file from Files.
- Optional passphrase: encrypt the export with Web Crypto (AES-GCM). A lost passphrase means a lost backup, so say so in the UI.

### Friend cards

- A friend card is a small snapshot: display name, XP, level, weekly XP, streak, and (later) avatar settings.
- Share it as a link (`#friend=...`) or a file. Opening a friend's link asks "Add friend?". The board sorts locally and updates when a friend re-shares.
- It runs on trust and is not live. A real-time leaderboard needs a backend (see Later).

### Phone and desktop do not share data

There is no server, so a plan made on a laptop does not appear on a phone. "Send plan to phone" (link or QR) and the JSON backup move data between devices. Hosted sync is a Later item.

### Test readiness

Reads the 2026-27 Singles Test Requirements chart (version 1.0, 02/27/26) and counts a jump or spin once it is rated 4 skates or more. Show the chart date, because rules change each season. The chart PDF stays out of the repo.

## Data model sketch

```json
{
  "schemaVersion": 1,
  "profile": { "name": "", "level": { "skills": "lts-freeskate/pre-free-skate", "freeskate": "lts-freeskate/pre-free-skate" } },
  "sessions": [
    { "id": "", "date": "", "bookedMin": 60, "onIceSec": 0,
      "entries": [ { "skillId": "", "stars": 3, "landed": 0, "attempts": 0, "note": "" } ],
      "note": "" }
  ],
  "plans": [],
  "friends": [],
  "settings": {}
}
```

## Catalog sources

Skill names are facts about a curriculum. Our files list names with a link to the source. Source PDFs are not committed.

| Data file | Content | Source | Status |
|---|---|---|---|
| `lts-basic.json` | Basic Skills 1-6, 45 skills | Riedell "Figure Skating Levels: Basic Skills 1-6", from Learn to Skate USA | Checked 2026-10-16 |
| `lts-freeskate.json` | Pre-Free Skate, Free Skate 1-6 | Riedell "Figure Skating Levels: Free Skate 1-6"; partly cross-checked against rink curriculum PDFs | Checked 2026-10-16 |
| `lts-adult.json` | Adult 1-6 | Learn to Skate USA Adult 1-6 Free Skate competition manual (2026) | Checked 2026-10-16 |
| `usfs-skating-skills.json` | 8 standard and 4 adult Skating Skills tests | U.S. Figure Skating Skater Checklist for Skating Skills (undated) and the 2023 testing structure flier for current names | Confirm against the current rulebook |
| `library.json` | Jumps (half, single, double, triple), spins, other elements | General figure skating knowledge, not from a test chart | Unverified |

## Design direction

Feedback on the first sketches: good and professional, but bland. The goal is fun to open, like Duolingo or a typical Apple app, with subtle notes from the Portfolio site, which is too busy to copy outright. Glowing lines and subtle background designs are welcome.

- Theme: "rink at night" by default. Portfolio cues: dusk navy `#151a4a`, deep navy `#101a45`, lake purple `#31206e`, ice `#4fd0d8`, neon `#7be3ff`, rose `#e0457a`, gold `#f2b83f`, cream `#fff8f3`. A light "daylight rink" theme can follow, so keep colors in CSS variables.
- Type: Unbounded for display text and numbers, Nunito for body, both from Google Fonts. Pill shapes (999px radius) for buttons and chips, 16-20px radius for cards.
- Duolingo-style fun: chunky buttons with a darker bottom edge that presses in, an XP bar that fills with a glow, a short celebration when a level or streak is earned, friendly empty states.
- Apple-style clarity: generous spacing, one clear action per screen, a translucent bottom tab bar on phones, a sidebar on desktop.
- Glow and background: glowing ice-blue lines on progress bars and the active card; faint ice-carve arcs behind content; optional slow snow on Home only. One glow per screen so it stays calm.
- Motion: everything animated has a reduced-motion off state.
- Placeholders: dashed "3D reference coming soon" panels on the Skate and Skill detail screens.

## Open questions

- Which skills should the first 3D poses cover? (Pick near Pre-Free Skate: waltz jump, mohawk, upright spin.)
- Exact rule for unlocking cosmetics.
- Whether to add a light theme before or after the stretch items.
