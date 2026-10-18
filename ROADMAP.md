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
- [x] Skate mode: booked-slot countdown, actual on-ice timer with pause, skill checklist, 1-5 star rating (it was skates until October 2026; the skate picture now only marks an earned skill), notes, and a landed/missed counter for jumps
- [x] History and progress: per-skill trend, level progress, ice time totals by week and month
- [x] XP, level bar, and weekly streak
- [x] Backup: export JSON (full), export CSV (read-only), restore with Merge or Replace, reminder after 7 days without a backup
- [x] Deployed on GitHub Pages, Portfolio card filled in, `CLAUDE.md` and `LOG.md` current
- [x] Placeholder panels where the 3D reference will go (Skate screen, Skill detail)
- [x] Guided tour: a hands-on practice run (plan, skate, save a session) with a spotlight, a sparkling path, and a card saying where to tap and what it does; offered once after setup, and any time from Home or Me ("Show me how MySkate works"). It replaced the earlier sheet of reading steps.

### Stretch, in this order

0. Ice times: your rinks' weekly sessions on one page, with filters, My picks, and calendar import (done)
1. Your ice: the background draws each skill's marks as you skate (built, then retired in October 2026 because it read as random squiggles; the background is now clean, see Round four and Round five under Design direction)
2. Blade life tile: editable sharpening limit (20, 25, 30, 35, or custom), hours since sharpening from logged on-ice time, a reset button, and an all-time total on the skates that never resets (done)
3. Time-budget planner: split the booked slot across the chosen skills (done, shared evenly)
4. Friend cards and a local friends board (done)
5. Connect devices by code, in both directions (small payload by QR; full history by backup file) (not built: a backup file, and a friend's link, already move what matters, and a QR scanner would need a library and a camera)
6. Cost per session and per month (done)
7. Test readiness against the 2026-27 Singles chart (done)
8. Passphrase-protected backups (Web Crypto, AES-GCM) (done)
9. Self-host the fonts (done: six files in `fonts/`, 192 KB, no request to Google)

### Later

- Skater customizer: done in a first form (colors for your avatar and card, some unlocked by level and badges; see Skater colors below). Drawing a skater figure, and clothes, wait for the 3D figure. Default look when that comes: leggings and a top. A dress is an option, not the default.
- 3D reference viewer: Three.js mannequin with drag to rotate, pinch to zoom, camera presets (front, side, back, top), and play/pause keyframed poses stored as data. Poses are hand-built approximations and need the skater's review, labelled "reference illustration, not coaching". A slider-based pose editor could let a skater or coach author correct poses.
- Accounts, cloud sync, and a live leaderboard through a hosted free tier (Supabase or Firebase). MongoDB Atlas would need a serverless function in between, because a browser cannot talk to it directly and Atlas's Data API shut down on 2025-09-30. Free-tier limits are not verified.
- A competition planner (done in a first form; see Competition planner below).
- Coach notes and homework (done), personal cue notes per skill (done), goals with target dates (done), off-ice training log (done). Left: notes from a coach on a whole session, and sharing homework with a coach.

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

### Ice cost

- Each saved session can have a cost (0 to 999, to the cent). Saving a session asks "What did this ice cost?", starting from the price of the Ice time it was planned from ("Plan this"), or your usual cost from Me. A cost can be added or changed later on the Sessions tab. No cost is "unknown", not free: free ice is 0, and unknown sessions are left out of every total and average.
- Progress shows this month, per session, per hour on ice, and in all, then each month with its sessions, hours, total and cost per hour (dollars per hour use only the sessions that have a cost). Home has an Ice cost tile once any session has a cost.
- Saved data: `session.cost`, `profile.defaultCost`, and `plan.cost`, all optional. The spreadsheet export has a `session_cost` column at the end.

### Badges

- 29 badges in five groups (On the ice, Skills, Jumps, Habits, Levels): first session, sessions, a full month, time on ice up to a marathon (26.2 hours), skills earned, five stars, personal bests, a level complete, jumps landed, a jump landed 80 percent of 20 tries, weekly streaks, notes, an all-rounder session, a sharpening, a backup, and levels 3, 5, and 10.
- Like XP, badges are worked out from the saved sessions every time and never stored, so merging, restoring, and fixing sessions always give the right trophy case. Replaying the sessions in order finds the day each was earned and how many sessions and days it took. A skill counts at its best rating, so a bad day cannot take a badge away.
- Progress has a Badges tab (a trophy case: gold medals earned, dashed ghosts with a progress bar for the rest, an "Almost there" list) and tapping a badge shows what it takes and when you earned it. Home has a Badges tile.
- A full-screen "New badge!" celebration (after the level-up one) follows saving a session, logging a sharpening, or saving a backup. `profile.badgesSeen` remembers which badges you were told about; the first time (and after a restore) it only notes what is already earned, so old progress does not set off a pile of celebrations.
- Share: a picture of the badge is drawn on this device and handed to the phone's share sheet, or saved as a file when the device cannot share files. Nothing is uploaded. The same picture idea is the base for friend cards.

### Friend cards

- A card is a small snapshot: name, level, XP in all, XP in the last 7 days, weekly streak, badge count, hours on ice. Nothing else (no sessions, notes, or ratings). It travels as a link: `#/friend?c=<code>` after the app's address, where the code is the card in base64. The part after the # is never sent to any website. A card holds an id that stays with the skater, so a newer card from the same friend updates them and an older one is ignored.
- Share my card (the phone's share sheet, or the link copied), Copy link, and Save as a picture (a 1080 by 1350 picture drawn on the device). Opening a friend's link (or pasting it into Add a friend) shows who it is and offers Add or Update. Opening it on a new device waits until setup is done.
- Progress has a Friends tab: the board ranks you and your friends by XP for the last 7 days or all time (ties share a place), with your own row live and each friend's as of their card (the board says so, and a friend sheet says how old the card is). Home has a tile with your place among friends once you have a friend.
- There is no live sync: that would need a server and accounts. A fresh card is one tap away for the friend.

### Goals, coach homework, and the off-ice log

- Goals (on Plan): a skill, a rating to reach (3, 4, or 5 skates), and an optional day. One goal per skill (setting another for the same skill changes it). A goal is reached when the skill's latest rating is at or above the target, like a test, so a bad day takes it back. Each shows the progress bar, the countdown (D-12, Passed), and "Plan it". Reaching one earns Goal reached (and Five goals), and the Home tile lists the open ones. You cannot set a goal you have already met.
- Coach homework (on Plan): a note (200 characters), an optional skill, an optional due day, ticked off with a real checkbox. Open items sort by due day, overdue ones turn coral, "Plan it" adds the linked skill to the plan, done ones fold away (Clear done), and finishing them earns Homework done (and Five homeworks). A Home tile lists what is open.
- Off-ice log (on the Sessions tab of Progress): stretching, strength, jump drills, dance, cardio, or other, 5 to 300 minutes, on today or an earlier day, with a note. It does not change XP or the weekly streak (those are for ice time). It counts toward the badges Off-ice workout, Off-ice regular (10), and Cross-trainer (3 kinds); the calendar shows a green dot on those days; Home shows the week's minutes.
- Saved data: `goals`, `homework`, and `offIce`, all optional. Limits: 30 goals, 60 homework, 1000 off-ice workouts.
- The pieces are `js/goals.js`, `js/homework.js`, and `js/office.js` (pure logic with tests), `js/ui/skillpick.js` (a search sheet to choose a skill), and `js/ui/officesheet.js`.

### Skater colors

- Me has Your color: six colors for your avatar (initials on a gradient). Sky and Rose are free; Mint needs level 2, Violet level 4, Sunset the Getting regular badge, and Midnight the Skill collector badge. A locked color says what unlocks it. The color shows on the friends board, on the card you send (a friend sees your color on your avatar), and tints the card picture.
- These colors are only about who you are. Colors that mean something in MySkate (gold for earned, blue for learning, coral for caution) are not on the list. A color you have not unlocked cannot be used even if a file says so (it falls back to Sky). A card's color is only ever one of the six.
- Saved data: `profile.look`; a card also carries the color id (`k`).

### Test readiness

- The Tests tab on Progress: pick the test you are working toward (the 12 U.S. Figure Skating tests: Pre-preliminary to Gold, and the four adult tests) and an optional test date. It shows days to go (D-12, Tomorrow, Today, or Passed) and two rings.
- Skating skills: the test's skills from the catalog, with the latest and best rating, the last five ratings as small squares, and a ring of how many are earned (4 skates or more, by the latest rating, since a test asks for it now). "Plan the ones not earned" adds them to the plan, the ones you have tried first.
- Free skate: a checklist of the jump, spin, and sequence requirements for that test, from the 2026-27 Singles Test Requirements chart (our own short summary, with the maximum time and which adult test shares it), that you tick yourself, because MySkate cannot see a jump. The page says to check the current rulebook and ask a coach.
- Home has a Your test tile (countdown and both counts). Saved data: `profile.test` ({ id, date }) and `testChecks` (item id to true), both optional.
- The checklists live in `data/catalog/freeskate-tests.json`. Its ids match the skating skills tests, and a test checks they stay in step.

### Practice calendar

- On the Progress overview: a month (weeks start Monday) with gold days for the days you skated, a blue dot on the days that have picked Ice sessions still to come, a ring on today, and a soft glow behind weeks that count toward a streak. Tap a day for its sessions (time on ice, skills, XP, notes) and its picked ice. The arrows move by month.

### Locked backups

- Me has Save a locked backup (passphrase). The backup text is locked with AES-256-GCM, using a key made from the passphrase with PBKDF2 (SHA-256, 600,000 rounds, a random salt), all with the browser's Web Crypto on the device. The file says how it was locked; a damaged or hostile file with an absurd round count is refused before any work. At least 8 characters, typed twice, and the sheet says plainly that a forgotten passphrase cannot be recovered.
- Restoring (from Me or from the first-run sheet) notices a locked file and asks for the passphrase (a wrong one can be retried). Accents and other languages work in a passphrase.

### Phone and desktop do not share data

There is no server, so a plan made on a laptop does not appear on a phone. "Send plan to phone" (link or QR) and the JSON backup move data between devices. Hosted sync is a Later item.

### Blade life

- Each skater sets their own limit: 20, 25, 30, 35 hours, or a custom number. Most sharpen between 20 and 35 hours; the app suggests nothing and uses what the skater or their sharpener says.
- Hours on the blades are editable, and grow by the on-ice time of every logged session. "I just got them sharpened" resets to zero (later: keep a history of sharpenings).
- All time on the skates: a running total that grows with every saved session and never starts over when the blades are sharpened. It is the hours from before MySkate (`blades.lifetimeBase`, one number the skater enters in setup or from the blade tile's pencil) plus the on-ice time of every session. It shows as hours, minutes, and seconds ("10 hrs 14 mins 13 secs", with the seconds left off when there are none) on the Blade life tile, on the Backstage board on Home, and on Progress (when there is a starting number); the tile's pencil has an hours box and a minutes box. Correcting the hours on the blades by hand moves the all-time total by the same amount, and the total is never fewer than the hours on the blades or the sessions saved. Older data starts it at the hours already on the blades. It is an optional field with a default, so `schemaVersion` stays 1. Later: start a new count for a new pair of skates.
- States by share of the limit: under 60% Sharp (blue), 60 to 89% Getting dull (gold), 90% and up Time to sharpen (coral). The tile draws the blade, bright for the fresh part and dull for the worn part.

### First run

- A setup sheet on the very first open: Set up my skates (names, sharpening limit, hours so far; skating-skills level and jumps-and-spins level from the catalog; usual slot), Restore a backup, or Connect from another device.
- Restore reads the file on the device, checks `schemaVersion` and a `sessions` array, shows the session count and date range, then offers Merge or Replace.
- The same settings stay editable afterward from the tiles and the profile.
- After setup (or after "I'll set up later"), the guided tour is offered once ("Learn it by doing": Show me around, or Skip for now; either counts as seen). It is always one tap away: the Help card on Me, and a "How MySkate works" button on Home until the first session is saved. Restoring a backup skips the offer.
- The guided tour is interactive. It runs in practice mode: the app shows a made-up copy of your data (your name, levels, usual slot, blades, and look, but none of your sessions), keeps none of what happens (saving, backups, badges, and level-up celebrations are held back), and puts your own data back when it ends or is skipped. A strip across the top says "Practice · nothing is saved".
- The steps (`js/tour.js`): Home (your week), Plan (the slot, a skill, a jump), Start session, the clock, rating, counting a jump's tries, Next skill, End session, Save session, the first loop of the eight; then, if you want more, Progress, Ice, Competitions, blade life, and backups, and a last card. Each step either asks you to tap something real (it notices by looking at the real state, so it works however you did it) or is a card to read with a Next button. A step that does not apply is skipped (no jump in the plan, no next skill); if you wander (discard the session, empty the plan) it slips back to the step that makes sense, and if you do a later step another way it moves on.
- On screen (`js/ui/coach.js`): a spotlight ring around the thing to tap, a dotted path of sparkles from the card to it, and a card with the title, what to do and what it does, and "Skip tour" (always there). A step inside a sheet (Save session) puts its words at the top of the sheet and rings the button. Nothing blocks a tap. With reduced motion the ring and the path stay and everything stops moving.

### Connect devices

- Show a code and Scan a code on both devices, so data can go computer to phone or phone to computer.
- One QR code holds about 3 KB (binary, low error correction): enough for setup, today's plan, friends, and the last 10 sessions. Full history moves by backup file (AirDrop, Files, email).
- Needs a QR encoder and a scanner (the BarcodeDetector API where available, a small library elsewhere) and camera permission. Both are downloads, so ask before adding them.
- Later: live pairing over WebRTC, with a QR to exchange the handshake, still without a server.

### Competition planner

Asked for by the skater on 2026-10-17, after they liked the rink diagram, choreography, marquee, kiss-and-cry, and Zamboni-day drafts: a section to create and plan a skate for the next competition. Built in stages, with the logic in `js/compete.js` (tested) and the screens in `js/screens/compete.js`.

- A Competitions route (`#/compete`, with `#/compete/p/ID/layout|timing|setup` and `#/compete/e/ID[/results]`, so the back button works). It has no tab of its own: it opens from Home and Plan, and Plan stays lit while you are in it.
- A competition (event): a name, a day, a place, its day (check-in, warm-up, the Zamboni, your skate, awards, in time order, with your skate stood out and a part called Zamboni in yellow and black stripes), a packing list with ticks, programs attached to it, and a result.
- A program: a name, the music (title, composer), a length (0:20 to 10:00), a kind (free skate, short, showcase, exhibition, other), and the competition it is for. Its steps are Setup, Layout, and Timing.
- Layout: a rink diagram. Tap empty ice to add an element where you tapped (or use a "+ Jump / Spin / Steps / Move / Pose" chip), tap a mark to select it, drag it to move it, or use the arrow keys or the nudge buttons. The route between marks redraws, numbers match the running order (I., II., III.), and an element can be one of your own skills, which shows your latest rating and counts toward "N of M skills in it are earned".
- Timing: the music as a track with each element as a block, a start and a length for each (m:ss and seconds), notes on the music ("the music swells"), spread evenly, overlaps called out, and a run-through clock that keeps time and calls out what is on now and what is next. It plays no music: the skater's music is theirs.
- Result ("kiss and cry"): a placing (like 2nd of 9), how each element went (clean, shaky, fell, skipped), what the coach said, and a note, shown as a TV-style scoreboard. A program can also be shared as a poster picture, drawn on the device like the badge and friend card pictures.
- Home shows the next competition as a small marquee with days to go and how much of its program is planned. The guided tour has a step for it.
- It never claims an event's rules. Length, elements, and times are only what the skater enters, with a reminder on the program form to check the event's rules and ask the coach. No scoring (no base values or GOE), because that would need the real rulebook.
- Saved data: `events` and `programs`, optional and cleaned on load, so `schemaVersion` stays 1. A backup merge keeps yours by id and adds the rest, and a program only points at an event that exists.
- Not done, and worth a look: badges for planning and competing; sharing a program with a coach; the program's music player; a calendar mark for the competition day.

### Your week, as a figure eight

- Home's centerpiece (`js/week.js`, drawn by `js/ui/eight.js`): two loops that touch in the middle, like the figures skaters once traced on the ice. Each session you save traces one loop, and a whole eight means the week counts toward your streak. The first loop shows the first session's day and time on the ice, the second shows the second's. The open loop says STEP ON (or PLAN IT, or BACK ON during a session) and the whole eight is the button.
- Under it, a row of small gold eights, one for each week in a row, with a dotted one for the week still to finish.
- The earlier idea, a background drawn from the skater's own skills (tracks per skill, carved live), was built and then retired in October 2026: on screen it read as random squiggles. The background is now clean ice.

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
- Type: Bodoni Moda (italic for titles, numerals for XP and levels) and Jost (UI and body), served from `fonts/` (self-hosted, so no outside request) with system fallbacks. Both are free open fonts. Satoshi would also work. Neue Machina and Söhne need paid licenses, so they are out for now.
- Liquid glass (retired in round four): translucent cards with a blurred backdrop, a bright top edge, and a soft highlight.
- Rewards: the XP bar fills with a spring and a moving sheen, "+20 XP" floats up, and a level-up takes over the screen with rays, a gold medallion that pops in, confetti stars, and a vibration on phones. Reduced motion shows the same screen without movement.
- Background layers (round four, replaced in round five by the stage glow): the ice, the low sun, a long diagonal sheen, twinkling sparkles, and a darker foot so type stays readable.
- One glow per screen: gold when it is about reward, ice when it is about the action in front of you.
- Motion: everything animated has a reduced-motion off state.
- Placeholders: dashed "3D reference coming soon" panels on the Skate and Skill detail screens.

Round three (after the second style tile): the skate looked like a children's book drawing and the blade matters as much as the boot; text was hard to read; big tiles felt bland; the background needed a redesign tied to skills. Colors and the ice gradient were loved.

- Skate art: a real figure-skate profile (high cuff, laces on gold hooks, mesh windows, gold-lined sole, gold posts) with a steel blade that has a hollow grind, glints, and a toe pick, shown with a reflection on the ice. Source in `assets/skate.svg`, previewed in `design/skate-lab.html`.
- Readability: Bodoni only for big moments (about 28px and up), Jost for everything small, 17px body at weight 450, brighter text colors, a dark tint under every glass surface, High contrast text mode, and text-wrap balance and pretty. Glass is layered on a readable base, not the other way around.
- Fonts: Bodoni Moda and Jost for now (OFL, free to self-host). Self-hosting WOFF2 subsets with a preload for the critical face, `font-display: swap`, and metric-adjusted fallbacks is the recommended next step.
- Tiles: each big tile shows its thing as a picture (blade, medallion and weekly bars, a row of skates, a calendar block) with etched ice in the corner.
- Background (retired in round four): a faint scratch texture under skill tracks drawn live from the skater's own skills.

Round four (2026-10-17, after the app was live): "I am not loving it. Visual UI looks are important to get someone excited to use the app." The glass-card look read as one tall stack of the same dark card on every screen, with nothing as the star, and Home opened with reminders before any progress. Three Home mockups in a familiar habit-app style (a bright light theme, a spotlight on the level, a game-like skill path) were turned down as too familiar to apps people are bad at checking into daily. A second round borrowed from skating itself (a living ice sheet with a figure eight, a printed program, a spotlit skate). Feedback: the ice with the figure eight was the favorite, but the squiggles in its background did not look good; the printed program looked like homework; the skate looked cool but something was missing.

- Direction: Fresh Ice. Clean, glossy ice under the low gold sun. Type is set on the ice with hairline rules between things, instead of cards. The week is a figure eight (see "Your week, as a figure eight"). Home leads with it, then three lines (level, next skill, blades), then the other sections, and the backup reminder comes last.
- Surfaces: none, except panels (sheets, toasts), which are dark and nearly solid. A section is a hairline above it. The one glow per screen is the hairline catching the sun, gold for reward and ice for action.
- Buttons: a bright ice-white pill that squishes and springs back is the main action; gold is for rewards (Save session, Keep skating), coral for ending or deleting, outline for everything else. Sections end in a quiet gold link, not a big button.
- Chips are outlined pills; a pressed chip fills with ice-white; a status chip is a quiet cyan, gold, or coral outline.
- Tabs inside a screen are plain words with a gold line under the current one. The main tabs are words only along the foot of the ice on a phone (a gold dot over the current one) and a list down the side on a desktop. There are no tab icons.
- Bars are a hairline with a glowing fill and a bright bead at the end, like a blade catching the light.
- Still true: Bodoni Moda italic for titles and numerals for big numbers, Jost for everything else; earned skates are the white-and-gold illustration; the level-up and badge celebrations keep their rays, medallion and confetti; every animation has a reduced-motion off state; a high contrast mode exists.
- Replaced in round five (below): Fresh Ice was dropped once the competition planner's look was chosen for the whole app.
- Not done, and worth a look later: the gold-skate-as-progress idea from the second round (a skate that fills with gold as skills are earned), which the skater liked but felt was missing something.

Round five (2026-10-17, later that night): after ten rough drafts, then a combination of seven and ten more, then eight screens for a competition planner, the skater chose the stage look for the whole app ("restyle the rest of the app so everything matches").

- The look: the stage (see CLAUDE.md). A dark house with a burgundy glow (golden hour), paper for what you can hold, a marquee for the big moments, a TV scoreboard for results, gold hairlines, Bodoni italic for the big words, and a cream button with a red offset shadow. The Light of day setting (sunrise, golden hour, midday, dusk) now tints the glow. Nothing is drawn on the background.
- Home, top to bottom: the date and season; "tonight, starring" over your name and a ghost of your level; a ticket for your next starred ice (when you have one); a program sheet of tonight's plan or the skills MySkate suggests, with your last rating and goal; the button (Take the ice, Plan the session, or Back on the ice); then this week as the figure eight with a stub for each day; a flap board for blades and level; and the rest in quiet sections. On a desktop the first part sits beside the rest.
- Retired: the figure eight as the main button (the cream button is; the eight is still tappable), the ice-cyan glow lines, the sparkles, and the sun and the sheen behind everything.
- Plan's panel is a paper program sheet; the Competitions screens, the guided tour, the sheets, and the celebrations all share the same pieces.

Round six and seven (2026-10-18): after trying everything on a phone at the rink, the skater found the stage look stressful to read (thin Bodoni strokes against thin rules) and not always clear about the next move. Three drafts in the Zamboni-day colors (`design/drafts-4.html`), then two improved versions of the favorite with every Home feature shown (`design/drafts-5.html`). The skater left the choice to MySkate's builder, who chose A3, the clean rink, because grouping Home into Tonight and Your progress makes the next move easiest to find; the interactive pieces the skater missed came along (the figure eight you trace, the ticket, springy buttons).

- The look: see the Design section of CLAUDE.md. Light ice colors, navy ink, a navy band at the top of each screen, Atkinson Hyperlegible Next for everything, cards with a soft edge, and the next move as the one card with the one button.
- Cheers: a quick skating scene when something is finished, about two and a half seconds, gone at a tap. A scratch spin for a saved session, the figure eight for a week that counts, the gold skate for a skill earned, a medal for a goal reached (one cheer per session, the biggest thing first), flowers on the ice for a competition result, a gleaming blade after sharpening, and a check for homework or off-ice work. Held back in practice mode, still with reduced motion.
- Retired: the dark stage, the flap board on Home, the separate badge tile (its count is now in Your progress), Bodoni Moda and Jost.

## Open questions

- Which skills should the first 3D poses cover? (Pick near Pre-Free Skate: waltz jump, mohawk, upright spin.)
- Exact rule for unlocking cosmetics.
- Whether to add a light theme before or after the stretch items.
