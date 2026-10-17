# MySkate roadmap

Source of truth for scope. Update it when a decision changes, and note the change in `LOG.md`.

## Principles

- Local-first: data stays on the device. JSON backup and restore protect it. No server.
- Phone first at the rink (one-handed, big tap targets). Desktop adds roomier planning and review.
- Fun but honest: XP, streaks, and glow make it a pleasure to open. Ratings are self-scored, so XP leans on time, consistency, and improvement.
- Every feature is small, working, and checked in a browser before it counts.

## Scope

### Must ship by Sunday 2026-10-18

- [x] Catalog data files: Learn to Skate USA Basic 1-6, Pre-Free Skate and Free Skate 1-6, Adult 1-6, U.S. Figure Skating Skating Skills tests, and a jump/spin/other library (233 skills, `data/catalog/`)
- [x] Level picker, separate for skating skills and free skate (owner starts at Pre-Free Skate), with suggested next skills
- [x] First-run setup: skates and sharpening limit, level pickers, usual ice slot, or restore from a backup file
- [x] Plan screen: pick skills, pick an ice slot (30, 45, 60, 75, 90, 120 minutes, or custom)
- [x] Skate mode: booked-slot countdown, actual on-ice timer with pause, skill checklist, 1-5 skate rating, notes, and a landed/missed counter for jumps
- [x] History and progress: per-skill trend, level progress, ice time totals by week and month
- [x] XP, level bar, and weekly streak
- [x] Backup: export JSON (full), export CSV (read-only), restore with Merge or Replace, reminder after 7 days without a backup
- [x] Deployed on GitHub Pages, Portfolio card filled in, `CLAUDE.md` and `LOG.md` current
- [x] Placeholder panels where the 3D reference will go (Skate screen, Skill detail)
- [x] Quick tour: six short steps with pictures, shown once after setup, and any time from Home or Me ("Show me how MySkate works")

### Stretch, in this order

0. Ice times: your rinks' weekly sessions on one page, with filters, My picks, and calendar import (done)
1. Your ice: the background draws each skill's marks as you skate (done)
2. Blade life tile: editable sharpening limit (20, 25, 30, 35, or custom), hours since sharpening from logged on-ice time, a reset button (done)
3. Time-budget planner: split the booked slot across the chosen skills (done, shared evenly)
4. Friend cards and a local friends board
5. Connect devices by code, in both directions (small payload by QR; full history by backup file)
6. Cost per session and per month
7. Test readiness against the 2026-27 Singles chart
8. Passphrase-protected backups (Web Crypto, AES-GCM)
9. Self-host the fonts (needs the owner's yes to download them)

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

### Ice times

- The Ice tab shows one week (Monday to Sunday) of sessions from all your rinks. Days are cards in a column on phones and a grid on wide screens. Each rink has a small color, shown as a dot and a strip on its cards.
- Rinks have no common schedule feed (web pages, PDFs, Facebook posts), and a static site cannot read other sites, so MySkate only knows what you put in: add a rink (name, city, link to its schedule page), then add sessions (type, days, start and end, optional price and note, optional from and until dates for seasonal schedules), or import a calendar file (.ics).
- Types: Freestyle, Public skate, Stick and puck, Learn to skate, Adult skate, Other. A session that repeats on several days is saved as one session per day, so each day can be starred (or changed) on its own.
- Star sessions to make My picks. The page toggles between All sessions and My picks, and can filter by type and rink (nothing selected means all). Picked sessions that overlap are flagged.
- Tap a session to edit or delete it, or to "Plan this" (sets your ice slot to its length and opens Plan). Home shows "Your next ice" (the next three picks). "Add my picks to my calendar" saves a calendar file of the picks.
- Calendar import (.ics) reads daily and weekly repeats (including every 2 to 4 weeks), one-off events, the dates a repeat skips (EXDATE), and single dates that were moved or cancelled (the way Google Calendar and Apple Calendar write a holiday closure). Times ending in Z are turned into the calendar's own time zone (Google names it) or, failing that, the device's. It leaves out all-day events, overnight events, monthly or yearly repeats, cancelled events, and events that already ended, and says how many.
- Upload a newer file for a rink and its imported sessions are updated: new ones added, ones no longer in the file removed, the rest kept with their star and price. Sessions you added by hand are never touched. The page shows what will change before you confirm, and a rink shows when its file was last imported (and a reminder after 3 weeks).
- Google Calendar: a rink that shares its calendar publicly has an iCal address that downloads a .ics file when opened in a browser. A web page cannot fetch that address itself (Google does not allow it), so the file is downloaded and then uploaded. Live syncing from an address would need a small server.
- Only the present and the future are kept: one-day sessions that have passed and repeats that have ended are removed automatically (on load, on restore, and on the Ice page). The week starts at this week, the earlier-weeks arrow is off, and days before today are not shown. Sessions that finished earlier today are dimmed.
- Saved data: `rinks` (with `updated`, the day a file was last imported), `iceSessions` (with `skip` dates, `every` n weeks, and `imported`), and `iceView` (your filters), all optional with defaults, so `schemaVersion` stays 1. Limits: 20 rinks, 500 sessions.
- Later: "Find rinks near me" from OpenStreetMap (opt-in, sends your location to OpenStreetMap; the free public servers were down when tried, so it could never be the only way), a starter list for an area, and live schedules (would need a server and a parser for each rink).

### Friend cards

- A friend card is a small snapshot: display name, XP, level, weekly XP, streak, and (later) avatar settings.
- Share it as a link (`#friend=...`) or a file. Opening a friend's link asks "Add friend?". The board sorts locally and updates when a friend re-shares.
- It runs on trust and is not live. A real-time leaderboard needs a backend (see Later).

### Phone and desktop do not share data

There is no server, so a plan made on a laptop does not appear on a phone. "Send plan to phone" (link or QR) and the JSON backup move data between devices. Hosted sync is a Later item.

### Blade life

- Each skater sets their own limit: 20, 25, 30, 35 hours, or a custom number. Most sharpen between 20 and 35 hours; the app suggests nothing and uses what the skater or their sharpener says.
- Hours on the blades are editable, and grow by the on-ice time of every logged session. "I just got them sharpened" resets to zero (later: keep a history of sharpenings).
- States by share of the limit: under 60% Sharp (blue), 60 to 89% Getting dull (gold), 90% and up Time to sharpen (coral). The tile draws the blade, bright for the fresh part and dull for the worn part.

### First run

- A setup sheet on the very first open: Set up my skates (names, sharpening limit, hours so far; skating-skills level and jumps-and-spins level from the catalog; usual slot), Restore a backup, or Connect from another device.
- Restore reads the file on the device, checks `schemaVersion` and a `sessions` array, shows the session count and date range, then offers Merge or Replace.
- The same settings stay editable afterward from the tiles and the profile.
- After setup (or after "I'll set up later"), the quick tour opens once: plan, skate, rate, XP and streaks, blade life, backups. "Skip the tour" closes it and counts as seen. It is always one tap away: the Help card on Me, and a "How MySkate works" button on Home until the first session is saved. Restoring a backup skips it.

### Connect devices

- Show a code and Scan a code on both devices, so data can go computer to phone or phone to computer.
- One QR code holds about 3 KB (binary, low error correction): enough for setup, today's plan, friends, and the last 10 sessions. Full history moves by backup file (AirDrop, Files, email).
- Needs a QR encoder and a scanner (the BarcodeDetector API where available, a small library elsewhere) and camera permission. Both are downloads, so ask before adding them.
- Later: live pairing over WebRTC, with a QR to exchange the handshake, still without a server.

### Your ice

- The background is the view from under the ice. Each skill the skater has practiced leaves its own marks there, drawn by `js/ice-tracks.js`. The skill's name and category pick the pattern, and its id picks the position, so a skill always lands in the same place.
- Patterns: glide, swizzle chain, crossover scallops, edge circles, figure eight, tiny 3s for three-turns, mohawk, twizzle loops, loop, spin spiral, jump takeoff and landing (toe-pick dots for toe jumps), stop skid with snow spray, spiral, step serpentine.
- Color jobs: blue marks are being learned, gold marks are earned, faint marks have not been practiced lately. Logging a rating carves that skill's marks live with a glint.
- "Peek at my ice" fades the interface to show the whole sheet. Use the real rating data instead of the demo's made-up states once the app has it.

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

Round two feedback (after the first style tile): skates need to be beautiful so they are worth earning (reference: a white Edea boot with gold trim); color should have life and purpose, not just be present; a bigger, bouncier XP celebration; background like looking up from under a frozen lake at skate traces and spin swirls with a sparkle glow; colors of ice cyan, deep blue, ice-rink white, and snow; type from Bodoni, Futura, Neue Machina, Söhne, or Satoshi; liquid glass like Apple's newest iOS; a sunrise or golden hour theme instead of night and day.

- Theme: golden hour, seen from under the ice. Light variants (sunrise, golden hour, midday, dusk) swap the sky and sun through `data-light`. Later idea: follow the real time of day.
- Color has jobs. Deep water: surfaces. Ice cyan: actions and learning. Ice white: text and highlights. Gold: earned (XP, streaks, earned skates, mastered progress). Coral: caution. Skill types: skating skills cyan (flow), jumps gold (air), spins lavender (rotation). Progress bars warm from ice to gold as they fill; the sharpening bar warms to coral.
- Skate art: unearned skates are gray ghosts. Earned skates are the white boot with gold trim, mesh windows, and a steel blade. Earning one bounces it in with sparkles. The simple line skate is only for navigation icons.
- Type: Bodoni Moda (italic for titles, numerals for XP and levels) and Jost (UI and body), from Google Fonts with system fallbacks. Both are free. Satoshi would also work. Neue Machina and Söhne need paid licenses, so they are out for now.
- Liquid glass: translucent cards with a blurred, saturated backdrop, a bright top edge, and a soft specular highlight. Pill buttons and chips are tinted glass that squish and spring back. The tab bar is a floating glass capsule with a lens that slides under the current tab.
- Rewards: the XP bar fills with a spring and a moving sheen, "+20 XP" floats up, and a level-up takes over the screen with rays, a gold medallion that pops in, confetti stars, and a vibration on phones. Reduced motion shows the same screen without movement.
- Background layers, back to front: water, low sun, skate traces (glide lines, crossovers, a figure eight, two spin spirals, a dotted toe-pick trail, scratches), twinkling sparkles, snow flecks, a vignette.
- One glow per screen: gold when it is about reward, ice when it is about the action in front of you.
- Motion: everything animated has a reduced-motion off state.
- Placeholders: dashed "3D reference coming soon" panels on the Skate and Skill detail screens.

Round three (after the second style tile): the skate looked like a children's book drawing and the blade matters as much as the boot; text was hard to read; big tiles felt bland; the background needed a redesign tied to skills. Colors and the ice gradient were loved.

- Skate art: a real figure-skate profile (high cuff, laces on gold hooks, mesh windows, gold-lined sole, gold posts) with a steel blade that has a hollow grind, glints, and a toe pick, shown with a reflection on the ice. Source in `assets/skate.svg`, previewed in `design/skate-lab.html`.
- Readability: Bodoni only for big moments (about 28px and up), Jost for everything small, 17px body at weight 450, brighter text colors, a dark tint under every glass surface, High contrast text mode, and text-wrap balance and pretty. Glass is layered on a readable base, not the other way around.
- Fonts: Bodoni Moda and Jost for now (OFL, free to self-host). Self-hosting WOFF2 subsets with a preload for the critical face, `font-display: swap`, and metric-adjusted fallbacks is the recommended next step.
- Tiles: each big tile shows its thing as a picture (blade, medallion and weekly bars, a row of skates, a calendar block) with etched ice in the corner.
- Background: a faint scratch texture under skill tracks drawn live from the skater's own skills.

## Open questions

- Which skills should the first 3D poses cover? (Pick near Pre-Free Skate: waltz jump, mohawk, upright spin.)
- Exact rule for unlocking cosmetics.
- Whether to add a light theme before or after the stretch items.
