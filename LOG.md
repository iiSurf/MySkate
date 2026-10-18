# MySkate log

What was planned and what changed, oldest first. One entry per working session or meaningful change.

## 2026-10-16 (Friday): planning and setup

### Plan

Build a figure skating practice tracker for myself: log sessions (which skills, how they went), track blade-on-ice time against booked ice slots, and see progress over time. It has to be live at `https://iisurf.github.io/MySkate/` and linked from the Artifact 2 card in the Portfolio, by Sunday 2026-10-18, 11:59pm.

### Decisions

- Name: MySkate. Separate repository from the Portfolio, deployed with GitHub Pages. The Portfolio card links to it.
- Stack: plain HTML, CSS, and JavaScript with no build step, so there is nothing to host beyond Pages.
- Data: stays in the browser. JSON is the backup and restore format (merge or replace, so old backups never wipe newer progress). CSV is a read-only export. No accounts or server for now.
- MongoDB: not used for now. Compass is only a desktop viewer, and a static site cannot safely reach Atlas. Revisit with a hosted backend later.
- Ice slots: 30, 45, 60, 75, 90, 120 minutes, plus custom. Both the booked slot and the actual on-ice time are tracked.
- Skill catalog: a level picker (owner is at Learn to Skate USA Pre-Free Skate, after finishing Adult 1-6), plus a jump/spin library so friends who land Axels can plan too. No navigating PDFs.
- Rating: 1 to 5 skates. Jumps also get a landed/missed counter, which gives a real accuracy number.
- Game layer: XP with a level bar, weekly streaks, and a friends board built on shareable friend cards (works on a static site, not live).
- Customizer: stretch only. Default outfit is leggings and a top; a dress is an option, not the default.
- 3D viewer: postponed until the app works. A placeholder panel is reserved for it.
- Design: fun like Duolingo or an Apple app, with subtle nods to the Portfolio and glowing lines. See `ROADMAP.md`.

### Sources used and what was and was not verified

- Learn to Skate USA Basic 1-6 and Pre-Free Skate/Free Skate 1-6 lists: read from the Riedell blog pages. Free Skate 2, 4, 5, and 6 were partly cross-checked against rink curriculum PDFs.
- Adult 1-6: read from the Learn to Skate USA Adult 1-6 competition manual PDF.
- U.S. Figure Skating Skating Skills: read from the Skater Checklist PDF. It is undated, so the element lists should be confirmed against the current rulebook. Current test names come from the 2023 testing structure flier.
- 2026-27 Singles Test Requirements (version 1.0): read from the owner's copy. Kept out of the repo. Will feed the test readiness stretch feature.
- The 451-page 2026-27 rulebook could not be read: the tooling could not render PDF pages and a text extraction found no jump names. Nothing in the catalog comes from it.
- A third-party test-level explainer was ignored because it used outdated names and contradicted itself.
- Not verified: Safari's storage clearing after about 7 days, and current free-tier limits of hosted backends.
- The Portfolio's `cards.js` Artifact 2 entry is currently a placeholder (`status: "idea"`, empty `link`).

### Design sketches

Two rounds of wireframes (phone and desktop). Round one: plan, skate with a placeholder figure, shareable progress card, desktop review. Round two: home with XP, jump counter, skill detail, friends board, backup and restore, customizer, desktop library and plan, test readiness. Feedback: good start, but bland and not enough tools yet. That led to XP, friend cards, blade hours, cost tracking, the time-budget planner, and the visual direction in `ROADMAP.md`.

### Changes

- Created the repository (by the owner) and cloned it to the workspace.
- Added `CLAUDE.md`, `ROADMAP.md`, `LOG.md`, and `.gitignore` (ignores `.DS_Store` and PDFs so source documents are never committed).

- Added the catalog in `data/catalog/`: `index.json` plus `lts-basic.json` (45 skills), `lts-freeskate.json` (49), `lts-adult.json` (30), `usfs-skating-skills.json` (66, across 12 tests), and `library.json` (43). Each skill has a permanent id, a name, and a category (`skills`, `jumps`, or `spins`); bonus skills are flagged.
- Verified with a script: every file parses, all 233 ids are unique, and every category is valid. Level counts match the sources (Basic 1-6 totals 45).
- Not verified: the content itself against the official Learn to Skate USA documents. The Free Skate lists come from a Riedell page. The U.S. Figure Skating element lists come from an undated checklist. The library is general knowledge.

## 2026-10-16 (Friday night): style tile

### Plan

The first sketches read as bland, so before building the app, make a small design preview page to approve the look: Duolingo-style fun, Apple-style clarity, Portfolio colors and fonts, glowing lines, subtle background designs, and not too busy.

### Changes

- Added the shared look in `css/`: `tokens.css` (colors, type, spacing, a night theme and a daylight theme), `base.css` (reset and the rink background: faint ice-carve lines and slow snow dots), and `components.css` (chunky pressable buttons, chips, cards, glowing XP bar, gold level badge with a level-up celebration, 1-5 skate rating, skill rows, jump counter, translucent tab bar, dashed 3D placeholder).
- Added `design/style-tile.html` (with `.css` and `.js`): palette, type, buttons, an interactive XP demo, a rating demo, skill rows, a friends board, and two phone-sized previews (Home and Skate).
- Added a custom skate icon (inline SVG) used for the rating and tab bar, so the app does not depend on an icon library.
- Added `.claude/launch.json` with the local server command.

### Verified

Checked in the browser pane at desktop width and at 375px wide: no horizontal overflow, fonts load (Unbounded and Nunito), no console errors. Clicking +20 XP three times levels up from 7 to 8 with the right XP carry-over and 12 sparks. The rating, slot chips, and theme toggle work. Night and daylight themes both render.

Two bugs found and fixed during the check: the level-up sparks were wiped by the XP re-render, and the + Landed / + Missed labels wrapped at phone width.

### Not verified

Reduced-motion behavior was not tested (the CSS rule is in place). Not checked on a real phone, Safari, or with the web fonts blocked. The glow strength and spacing still need the owner's approval.

### Decisions

- One glow per screen: the XP card (Home) or the jump counter (Skate) carries it. Ratings go flat on a screen that already has one.
- Fonts load from Google Fonts with system fallbacks, as the Portfolio does. If we want zero third-party requests, self-host the fonts later.

### Next

Owner reviews the style tile. (Feedback came back the same night; see round two below.)

## 2026-10-16 (Friday night): style tile, round two

### Plan

Owner feedback on round one: the skates should be beautiful enough to be worth earning (a white Edea boot with gold trim was the reference); the color had no life or purpose; wants a bigger, bouncier XP celebration; wants the background to feel like looking up from under a frozen lake at skate traces, spin swirls, and a sparkle glow, in ice cyan, deep blue, ice white, and snow; prefers Bodoni, Futura, Neue Machina, Söhne, or Satoshi type; wants an Apple liquid glass feel; and wants a sunrise or golden hour theme instead of night and day.

### Changes

- Replaced the night/daylight themes with one golden hour theme and a light picker (sunrise, golden hour, midday, dusk) driven by `data-light`.
- Background: new generated art `assets/ice-traces.svg` (made by `design/make-ice-traces.py`): glide lines, crossover scallops, a figure eight, two spin spirals, a dotted toe-pick trail, and fine scratches, with a glow. Layered with a warm low sun, twinkling sparkles, snow flecks, and a vignette.
- Color with jobs: blue is learning, gold is earned, coral is caution. Skill-type dots (cyan skills, gold jumps, lavender spins). Progress bars warm from ice to gold as they fill; the sharpening bar warms to coral.
- Skate art: an illustrated white-and-gold figure skate (mesh windows, crisscross laces with gold hooks, gold posts, steel blade with a toe pick) used for ratings. Unearned skates are gray ghosts. Earning bounces them in with sparkles. Navigation keeps a simple line skate icon.
- Type: Bodoni Moda (display, italic titles, numerals) and Jost (UI), replacing Unbounded and Nunito. Satoshi would also work; Neue Machina and Söhne need paid licenses.
- Liquid glass components: cards, chips, buttons, and the tab bar are translucent with a blurred backdrop, a bright top edge, and a soft highlight. Buttons squish and spring. The tab bar has a lens that slides under the current tab.
- Level-up celebration: a full-screen overlay with rotating rays, a gold medallion that pops in, 58 confetti pieces and stars, a "Level up!" title, and a vibration on phones. "+20 XP" floats up on every tap, and the XP bar fills with a spring and a moving sheen.

### Verified

Checked in the browser pane at desktop width and 375px: no overflow, Bodoni Moda and Jost load, no console errors. The rating bounces in and shows the label. Three XP taps level up from 7 to 8 and open the overlay (rays, medallion, title, button). Escape closes it, returns focus to the XP button, and pops the level badge. The tab lens lands under the current tab on both phone previews. Sunrise, midday, dusk, and golden hour all render.

Found and fixed along the way: the first golden hour sun blended into a gray-mauve; it is now a gold-to-rose-to-lilac gradient.

### Not verified

Reduced-motion behavior (the CSS and JavaScript handle it but it was not exercised). A real phone and Safari, where backdrop blur and the vibration may differ. The overlay's confetti was only seen as it faded; its motion was not watched. Pressing Escape through the pane's key tool did not close the overlay, but dispatching the same keydown event did, so the handler works. The skate art was checked large and small but not by a skater's eye.

### Decisions

- Google Fonts only (Bodoni Moda, Jost). Fonts that need paid licenses are out.
- The glow rule stays: one glow per screen.

### Next

Owner reviews round two. (Feedback came back the same night; see round three below.)

## 2026-10-16 (Friday night): style tile, round three

### Plan

Owner feedback on round two: the skate still looked like a children's-book drawing rather than a real skate like the Edea reference, and the blade matters just as much (shape and reflection); text was hard to read, so what are the best current web font practices; big tiles felt bland, and the sharpening interval should be editable (some skaters sharpen at 20 hours, some 25, some 35); wants a first-run screen to enter skate stats or restore a JSON file; wants friend cards and a QR code to move data between computer and phone, both directions; and the background should be redrawn so the skate lines depend on the skater's skills and are drawn in real time. Colors and the ice gradient were loved.

### Changes

- Skate art redrawn (`assets/skate.svg`, symbol `skate`): a real figure-skate profile with a high cuff and Achilles notch, tongue and crisscross laces on gold hooks, oblong mesh windows, a gold-lined sole and heel, two gold posts, and a steel blade with a hollow-grind line, moving glints, a bright edge, and a solid toe pick. A second symbol, `blade`, is the blade alone. `design/skate-lab.html` shows both large, with an ice reflection, and at small sizes.
- Readability: brighter text colors, 17px body at weight 450, Bodoni limited to big moments (titles, numerals, medallions) and Jost for everything small, a dark tint under every glass surface, `text-wrap` balance and pretty, and a High contrast text mode (`data-contrast="high"`, also switched on by `prefers-contrast: more`). `prefers-reduced-transparency` is handled too, but its support is patchy (Safari does not support it), so legibility does not depend on it.
- Tiles with a job: Blade life (a steel blade that is bright for the fresh part and dull for the worn part, a hours counter, a state chip that goes from Sharp to Getting dull to Time to sharpen, editable limit chips of 20, 25, 30, 35 or custom, editable hours so far, and an "I just got them sharpened" reset), XP (medallion, bar, weekly bars), curriculum (a row of skates, one per skill), and next ice slot (calendar block). Each has etched ice in the corner (`assets/tile-trace.svg`).
- Your ice: `js/ice-tracks.js` draws each skill's marks on the background. The skill's name and category pick the pattern (swizzles weave, edges loop, crossovers scallop, three-turns leave tiny 3s, mohawks, twizzles, loops, spin spirals, jump takeoffs with toe-pick dots and landings, stops with a snow spray, spirals, step serpentines). The skill id picks the position, so a skill always lands in the same place. Blue marks are learning, gold are earned, faint are stale. "Carve the next skill" draws one live with a glint. "Peek at my ice" fades the page to show the whole sheet. The old static trace art was replaced by `assets/ice-texture.svg` (fine scratches) and both assets come from `design/make-ice-assets.py`.
- First run: a setup sheet with Start fresh (skates and sharpening limit, level pickers filled from the real catalog, usual ice slot), Restore a backup (reads a JSON file on the device, checks it is a MySkate backup, shows the session count and date range), a sample backup, and Connect from another device.
- Connect devices: a sample screen with Show a code and Scan a code, and both directions (computer to phone, phone to computer). The code is a sample, not real.

### Research notes

- Fonts: self-host WOFF2 subsets, preload only the critical face (with `crossorigin`), use `font-display: swap` with metric-adjusted fallbacks (`size-adjust`, `ascent-override`, `descent-override`), and use variable fonts only when several weights are needed. Several sources were low quality, so verify against MDN and web.dev. Self-hosting needs downloading font files, so it waits for the owner's yes. Bodoni Moda and Jost are both under the SIL Open Font License, which allows self-hosting.
- Liquid glass legibility: translucent surfaces have no fixed contrast ratio, so solid, high-contrast surfaces should be the baseline and glass layered on top. `prefers-reduced-transparency` is in Chrome and Edge 118 and later, behind a flag in Firefox, and not in Safari.
- QR transfer: one QR code holds about 3 KB in binary at low error correction, so a code can carry setup, plan, friends, and recent sessions. Full history moves by backup file. A live pairing over WebRTC (no server, QR to exchange the handshake) is a later option.

### Verified

Browser pane, desktop and 375px: no overflow and no console errors apart from a vibration call my script made without a tap (now guarded). Blade tile: edit panel, chips, custom limit, hours field, plus and minus, state and "hours left" text, and the sharpening reset all behave (Sharp under 60%, Getting dull under 90%, Time to sharpen above, "Over by" when past the limit). Ice: 38 tracks draw from the real catalog, carving adds one live and moves the slider, peek mode shows and hides the full sheet. First run: bad JSON, a wrong-shape JSON, and a sample file each give the right message; the steps, dots, level pickers (31 and 14 options from the catalog), and summary work. Connect sheet toggles mode and direction. High contrast text toggles. All four light variants still render.

Found and fixed: the hidden attribute was beaten by button styles (a global `[hidden]` rule now wins), and "counterclockwise" was matching the "counter" turn pattern.

### Not verified

The animated carve was seen by its result, not watched. Reduced motion, a real phone, and Safari (backdrop blur, `clip-path` transitions, external SVG `use`) were not tested. The skate art was checked by eye at several sizes but not by a skater. The QR is a drawing, not an encoder, and no camera scanning exists yet. The catalog mapping to track patterns is by keyword and has not been reviewed skill by skill.

### Next

Owner reviews round three. Then build the app shell (index.html, JavaScript modules) that loads the catalog, with first-run setup and the tiles, followed by the plan screen and the Pages deploy.

## 2026-10-16 to 2026-10-17 (Friday night): the app

### Plan

Build the real app from the approved style tile, in this order: logic with tests first (so progress and saved data are trustworthy), then the screens (Home, Plan, Skate, Progress, Me), first-run setup, backups, and a review pass.

### Changes

- Logic in `js/`, with 46 tests (`npm test`, Node's built-in runner, reading the real catalog):
  - `store.js`: the saved-data shape (`schemaVersion` 1), loading and saving that survive blocked or full storage, sanitizing everything that comes from storage or a file, JSON and CSV export, restore by merge or replace, and a CSV that guards against spreadsheet formulas.
  - `xp.js`: XP is replayed from the sessions, never stored (session, minutes, skills practiced, personal bests, first time at 4 and 5 skates, weekly streak), level costs, and streak weeks.
  - `stats.js`, `blades.js`, `timer.js`, `plan.js`, `catalog.js`, `util.js`: per-skill history, level progress, what to practice next, which skills show on the ice, blade life against the skater's own limit, an on-ice clock built from timestamps, slot splitting, and a safe `html` template tag.
- Screens: Home (greeting, plan or session card, XP tile, level tiles, editable blade life, week tile, recent sessions, backup reminder), Plan (slot chips, suggestions, level lists, browse every skill, minutes per skill, reorder), Skate (clock with pause, skill queue, rating, notes, landed and missed counter with undo, add a skill, finish sheet with the XP breakdown, level-up celebration), Progress (overview, skills, sessions, skill sheet with a trend and personal cues), and Me (name, levels, usual slot, light and contrast, backup and restore, keep-my-data request, sources, delete everything).
- First-run setup sheet with backup restore. The ice behind everything carves each skill as it is first rated, and the colors follow learning, earned, and stale.
- `index.html`, `css/app.css`, `assets/favicon.svg`, `README.md`, `tools/serve.py`.

### Verified

- Browser pane, desktop and 375px wide: no horizontal overflow on any screen after fixing a column that stretched past the phone (long select options), no console errors from the app.
- Driven end to end with real clicks: first-run setup saved the profile and blade settings; planning five skills, reordering, removing, changing the slot; starting a session, rating, clearing a rating, notes, pausing (clock froze) and resuming, the jump counter and undo; a reload mid-session restored the session with the clock still running; finishing with Keep skating, then Save; the session saved with its note, XP replayed, and the level-up appeared when the level changed; blade limit chips, custom limit, hours, plus and minus, sharpening reset with a confirm sheet; export, merge of the same file (nothing doubled), a bad file, replace with a confirm that cancelled cleanly; light and high contrast.
- A code review of `js/` (15 findings) turned up real issues, all fixed: empty ARIA states, lost keyboard focus after every re-render, the jump library showing 0 of 0, the usual ice slot setting doing nothing, a plan over the slot reporting more minutes than the slot, NaN times in a damaged saved session, the screen wake lock outliving a wiped session, the custom slot not marking a matching chip, background animations running through a session, an unused XP calculation on every tap, duplicated filters, no byte-order mark in the CSV, no tests for escaping or ice patterns, and this log being behind.

### Found and fixed along the way

- Python's `http.server` has a tiny connection queue and dropped requests while the browser loaded the module graph, leaving a blank page. `tools/serve.py` queues more and sends no-cache headers. GitHub Pages is not affected.
- The `dialog` close event did not always arrive in a background tab, so sheets now settle their promise when they are closed directly.
- Dates for the backup reminder and sharpening used the UTC day, which was a day ahead in the evening. They now use the local day.
- Bodoni numerals lost their thin strokes at everyday sizes (a 4 looked like a 1). Numerals now use a sturdier optical size.

### Not verified

A real phone, Safari, the screen wake lock, vibration, and reduced motion. Restoring a very large backup. The Pages deploy and the Portfolio card (see Next). Friend cards, connecting devices by code, and the 3D reference are not built; the 3D area is a labeled placeholder.

### Next

Turn on GitHub Pages for `MySkate`, check the live site, fill in the Artifact 2 card in the Portfolio, and then the stretch items in `ROADMAP.md`.

## 2026-10-17 (Saturday): live and connected to the Portfolio

### Plan

Check the live site on GitHub Pages, then publish the Artifact 2 card in the Portfolio so MySkate opens from it.

### Changes

- GitHub Pages is on for `main`, root folder. Live: https://iisurf.github.io/MySkate/.
- The Portfolio's Artifact 2 card (`cards.js` in iiSurf/Portfolio) is now `status: "done"` with the title MySkate, an "Open MySkate" button that goes to the live site, and a reflection the owner approved. The Portfolio's own `LOG.md` has an entry.

### Verified

- On the live site: the app boots, all 233 skills load, no failed requests, no console errors, both fonts load, and the first-run sheet appears. A full run on the live origin (skip setup, plan three skills, start, rate, end, save) saved a session and carved the first track on the ice. The test data was removed afterward.
- On the live Portfolio: the village shows "Artifact 2, MySkate, Open", the shop shows the reflection, and the "Open MySkate" link goes to https://iisurf.github.io/MySkate/ and opens in a new tab.

### Notes

- All pages under `iisurf.github.io` share one browser storage area, so another project on the same account could read MySkate's saved data. Today that is only the Portfolio, which does not touch it. A backup file is still the safe copy.
- The reflection is long, and on a small desktop window the shopkeeper's speech bubble covers a few words of it. Shortening it would fix that.

### Not verified

A real phone and Safari. Friend cards, connecting devices by code, and the 3D reference are still on the roadmap.

### Next

Try it on a phone at the rink, then pick from the stretch list in `ROADMAP.md` (friend cards, connect devices, test readiness, encrypted backups, self-hosted fonts).

---

## 2026-10-17 (Saturday): a quick tour for new skaters

### Planned

The owner found MySkate hard to understand. Add a tutorial that opens the first time the app is used, and a button in Me that opens it again whenever someone forgets how something works.

### Changes

- `js/tour.js` holds the six steps as plain data: Plan, skate, grow; Plan your session; On the ice; Finish and watch it grow; Blade life; Your data stays with you. The numbers in the text (slots, XP, streak, skates that earn a skill) are read from the same constants the app uses, so the tour cannot drift from how it really works.
- `js/ui/tour.js` shows the steps in a sheet, each with a small picture built from the app's own pieces (the clock, skates, XP bar, blade, buttons). Back, Next, dots, arrow keys, and "Skip the tour" at the top. The steps share one grid cell, so the sheet keeps one height and does not jump. On wide screens the picture sits beside the words; on phones the steps scroll inside the sheet while Back and Next stay put; on short screens the pictures hide so the words fit.
- It opens by itself once, right after first-run setup (also after "I'll set up later"), and for someone who already has data and has not seen it yet (not while a session is running). Closing it any way counts as seen. Restoring a backup counts as seen.
- Help card at the top of Me: "Show me how MySkate works". On Home, a "How MySkate works" button sits next to "Plan a session" until the first session is saved.
- Saved data gets one new optional field, `profile.tourSeen`. It defaults to false, so old backups load fine and `schemaVersion` stays 1. `CLAUDE.md` now says when a version bump is and is not needed.
- Added a `.sr-only` helper so the tour can announce "Step 3 of 6: On the ice" to screen readers.

### Verified

- 52 tests pass (6 new): the steps are well formed and name a picture that exists; the tour quotes the real numbers; every button the tour tells you to tap really has that label in the screens; the Me and Home buttons exist; the flag defaults, sanitizes, and old backups load; restore and merge treat it correctly.
- In the browser: first run (clean storage, skip setup) opens the tour with "Skip the tour"; all six steps show their pictures; Next ends on "Got it" and saves the flag; reload does not show it again. Help on Me opens it with "Close", Escape closes it, and focus returns to the button. Arrow keys move between steps. Checked at 1024x768, 390x844, 320x568, and 844x390 (phone sideways): nothing is cut off and Back, Next, and Skip stay reachable.

### Not verified

A real phone and Safari, and a screen reader (the step announcement is in place but only checked in the markup).

---

## 2026-10-17 (Saturday): Ice times

### Planned

The owner wanted to see local rinks, pick favorites, and see all of the week's sessions from several rinks on one page (freestyle, public skate, and so on), filtered to just the sessions they want, so they do not have to open three rink websites. Tag the live version first and push only when told.

### What I found out first

- Rinks have no common schedule feed. Searches turned up web pages, PDFs, monthly calendars, and Facebook posts; no calendar feed to subscribe to. A static site cannot read other sites, and scraping would need a server and a parser per rink that breaks when a rink redesigns its page. So MySkate cannot pull schedules in by itself: you enter them once a season, or import a calendar file.
- Nearby rinks from OpenStreetMap would work in principle, but the free public servers failed (busy or error) on three tries, and it would send the owner's location to a third party. Left for later, as opt-in.

### Changes

- The live version is tagged `submitted-v1` in git (local only) so there is a rollback point.
- `js/ice.js`: kinds, weekday and time helpers, cleaning of everything that comes from storage or a file, the week (a session on its days within its dates, or on one date), filters, overlap detection for picks, upcoming picks, a calendar reader (repeats weekly or daily, one-offs, UTC or floating times, COUNT and UNTIL, folded lines; all-day, overnight, unusual repeats, cancelled, and ended events are counted and left out) and a calendar writer (escaped text, 75-byte lines, repeating events for weekly sessions).
- Saved data: `rinks`, `iceSessions`, `iceView`. All optional, cleaned on load and on import, merged by id (yours win), included in backups. `schemaVersion` stays 1.
- The Ice tab (`js/screens/ice.js`): the week bar with arrows, All sessions or My picks, a Filter button (type and rink), the week (a column of day cards on phones, a grid on wide screens), a star on each session, overlap warnings, and a My rinks card. Sheets to add and edit a rink, add and edit a session (several days at once become one session per day), and import a calendar file. Tap a session to edit, delete, or Plan this. "Add my picks to my calendar" saves a calendar file.
- Home: a "Your next ice" tile (the next three picks) once a rink exists. Plan: a "Find ice time" button. The tab bar has six tabs. The quick tour has a new step, "Find your ice time".
- Form sheets keep Save and Cancel in view while the form scrolls.
- Rink links must be http or https with a real-looking host. One bug found while testing: "javascript:alert(1)" got "https://" put in front of it and was saved as a link. It could not run, but it is now rejected, and a test covers it.

### Verified

- 74 tests pass (22 new for ice times, plus the tour tests extended), in three time zones (local, Tokyo, New York): weekday mapping, date ranges, sorting, filters, overlaps, upcoming picks across a week boundary, slot sizes, kind guessing, calendar reading (all the skip cases, UTC, COUNT, folded lines, junk input), a calendar export that reads back the same, saved data (defaults, old backups, orphan sessions, merge, replace).
- In the browser: added 3 rinks and 8 sessions through the real forms (11 sessions after splitting days), filters and My picks (counts matched), overlap warnings, week arrows, starring keeps focus, editing a session to add a day, deleting a session, deleting a rink (its sessions go too), Plan this (slot became 90), importing a calendar file (3 sessions, extras counted, importing it again adds nothing), exporting picks (10 picks gave 10 events, CRLF lines). Home tile and the new tour step look right.
- Checked at 1440x900, 1024x768, 390x844, and 320x568: no sideways scrolling, the six tabs fit, the form buttons stay in view.

### Not verified

A real phone and Safari. Opening an exported calendar file in a real calendar app. Real rink calendar files (only sample files were tried). The style tile was not updated for the new cards. Nothing is pushed: the live site does not have Ice times yet.

---

## 2026-10-17 (Saturday, later): calendar files that update, Google Calendar, present and future only

### Planned

The owner liked the calendar-file idea and asked for three things: uploading a rink's file again should update what is on the page; it should work with rinks that use Google Calendar; and only the present and future dates should be kept.

### What I found out first

- Google Calendar's public iCal address returns a normal calendar file, but without the header a web page needs to fetch it (no `Access-Control-Allow-Origin`), so MySkate cannot read it by address. The workable path is the one the owner described: download the file (opening the iCal address in a browser downloads it), then upload it.
- Real Google calendars write holiday closures as skipped dates (EXDATE) and moved or cancelled single dates (separate events with RECURRENCE-ID), and write times in the rink's time zone. The first calendar reader ignored all of that, so a closed day would still have shown. I could not test a real rink's Google calendar; I built to the calendar standard and tested with files shaped like Google's.

### Changes

- The calendar reader now handles skipped dates, moved and cancelled single dates (the move becomes its own one-day session and the original date is skipped), every 2 to 4 weeks, reminders inside events (ignored), and times in UTC (turned into the calendar's own zone from X-WR-TIMEZONE, or this device's zone when there is none).
- Sessions can now have `skip` dates and repeat every n weeks. The calendar writer writes both back out (EXDATE, INTERVAL).
- Updating: `applyImport` replaces what was imported from a file for a rink with the new file's sessions. A session that is still there keeps its star and its price; sessions you added by hand are untouched and never copied. The import sheet shows the counts first ("2 new, 3 already there, 2 no longer in the file (removed)"). Each rink shows when its file was last imported, an "Update from a file" button, and a reminder after 3 weeks. The sheet explains how to get a file from a rink's site, Google Calendar, and Apple Calendar.
- Present and future only: sessions that have passed are dropped on load, on restore, and on the Ice page. The week starts at this week, the earlier-week arrow is off, days before today are not shown, sessions that ended earlier today are dimmed, and the forms do not accept past dates.

### Verified

- 84 tests pass in four time zones (local, Tokyo, New York, Auckland). New ones cover skipped, moved, and cancelled dates, every other week, time zones (including the clocks changing and an unknown zone name), reminders, export and read-back with skipped dates, dropping passed sessions, and updating (stars and prices kept, hand-added sessions untouched, no copies, the session limit).
- In the browser, with a Google-style file: Z times came out right (2 PM), the moved session appeared on its new time, the skipped Thursday and the cancelled Tuesday were missing, the every-other-week class showed on the right Sundays, an old event and an all-day closure were left out and counted. A second, changed file updated the rink (2 new, 2 removed, 3 the same) and the starred session kept its star and price. Sessions added with past dates disappeared on reload and from storage. At 390 wide the import sheet has no sideways scroll and its buttons stay in view.

### Not verified

A real rink's calendar file or Google calendar. Opening an exported file in a real calendar app. A real phone and Safari. Nothing is pushed.

---

## 2026-10-17 (Saturday, evening): ice cost and badges

### Planned

Next on the owner's list after Ice times: cost per session and per month, then badges and a trophy case. Do not push.

### Ice cost

- A session can have a cost (0 to 999, to the cent). A missing cost is unknown, not free (free is 0), and unknown sessions are left out of every total and average, including dollars per hour (which uses only the hours of sessions that have a cost).
- Saving a session asks "What did this ice cost?", starting from the price of the Ice time it was planned from ("Plan this" now carries the price), or the usual cost set in Me. The Sessions tab on Progress can add or change a cost later.
- Progress has an Ice cost card (this month, per session, per hour on ice, in all, and each month with sessions, hours, total, and cost per hour; months with no sessions are left out). Home has an Ice cost tile once a session has a cost. The spreadsheet export has a `session_cost` column at the end.
- Saved data: `session.cost`, `profile.defaultCost`, `plan.cost`, all optional (`schemaVersion` stays 1).

### Badges

- `js/badges.js`: 29 badges in five groups. Like XP they are worked out from the saved sessions every time and never stored. Replaying the sessions in order finds the day each was earned and how many sessions and days it took. A skill counts at its best rating, so a bad day cannot take a badge away. A sharpening or a backup earns its badge on its own day. The weekly streak uses a running count that is tested to give the same answer as the streak on Home.
- Progress has a Badges tab (trophy case: earned medals in gold, the rest as dashed ghosts with progress bars, an "Almost there" list). Tapping a badge shows what it takes and when it was earned. Home has a Badges tile.
- A full-screen "New badge!" celebration comes after the level-up one when a session is saved, and after logging a sharpening or saving a backup. `profile.badgesSeen` remembers which badges the skater has been told about. The first time, and after a restore, it only notes what is already earned, so old progress does not set off a pile of celebrations.
- Share: a 1080 by 1350 picture of the badge is drawn on a canvas on this device (JPEG, so it is small enough to send), handed to the phone's share sheet, or saved as a file when the device cannot share files. Nothing is uploaded.
- The Progress tabs row now has four tabs and fits at 320 pixels wide. The quick tour mentions cost and the Badges tab.

### Verified

- 113 tests pass in four time zones. New ones: cost cleaning and formatting, monthly totals, unknown versus free, merging; 30 for badges (every badge's icon exists in the page, replay order, earned day and sessions and days taken, months, hours, a long session, best rating, personal bests, level complete, landed jumps and 80 percent, streaks including a gap, running streak equal to the Home streak, notes, all-rounder, sharpening and backup days, XP levels, no mutation, not reusing the last answer); the tour's button labels still exist on screen.
- In the browser: set a usual cost in Me, saved two real sessions (the cost started at the usual cost and was changed on one), the Progress and Home cost cards were right, a cost was changed and cleared on the Sessions tab (and 2000 was refused). A real session earned First session, First skill earned, and All-rounder, and the celebrations came in order (level up, then badges). The share picture rendered at 1080 by 1350 and the save-as-file fallback worked. Trophy case and badge sheets at 1024, 390, and 320 wide; every route at 390 has no sideways scroll; no console errors.

### Not verified

Sharing through a real phone's share sheet (only the save-as-file path was exercised). A real phone and Safari. Nothing is pushed.

---

## 2026-10-17 (Saturday, night): pushed to the live site

### Changes

- Everything since the quick tour (Ice times, calendar update and Google Calendar dates, ice cost, badges and sharing) is live at https://iisurf.github.io/MySkate/. The version that was live before is tagged `submitted-v1` in git on this computer (the tag is not pushed).
- Two fixes found while checking the live site, both pushed: a full-screen celebration could stay up if the browser never reported its fade-out finishing (it now closes after half a second no matter what), and a session ended straight away gave an absurd cost per hour (dollars per hour now waits for 15 minutes on the ice behind it).

### Verified on the live site

First run (setup, then the 7-step tour), the six tabs, adding a rink and importing a Google-style calendar file (3 sessions, a skipped date handled, earlier weeks off), starring a session, a real session saved with a cost, the celebrations in order (level up, then 3 new badges) and both closing, the cost card and Home badge tile, and no console errors. 114 tests pass in four time zones.

### Not verified

A real phone and Safari: the share sheet, the file picker for a calendar file, the on-ice clock with the screen locked, and opening an exported calendar file in a calendar app.

---

## 2026-10-17 (Saturday, night): friends, test readiness, practice calendar, locked backups

### Planned

The next items on the stretch list, before trying the new features on a phone: friend cards and a board, test readiness against the 2026-27 Singles chart, a practice calendar (an idea from the competing apps), and passphrase-protected backups. Fonts need the owner's yes to download, so they wait for an answer.

### Friends

- `js/friends.js`: a card is a name, level, XP in all, XP in the last 7 days, streak, badge count, and hours on ice, plus an id that stays with the skater. It travels as a link (`#/friend?c=<code>`); the part after the # is never sent to any website. Reading a card is strict (length, characters, version, every number clamped, control characters removed) and a name stays plain text because the screens escape everything.
- Adding a friend: a new one is added; a newer card from the same friend updates them; an older card, your own card, or a full list (100) is refused with a reason. A friend's link works when the app is open, when it is opened fresh, and on a new device (it waits until setup is done). A card can also be pasted into Add a friend, with or without the words around it.
- Progress has a Friends tab: the board (last 7 days or all time, ties share a place, your row live and theirs as of their card, with the card's age shown), your card with Share, Save as a picture, and Copy link, and Add a friend. Home has a tile with your place once you have a friend. Saved data: `friends` now also keeps badges and hours (older saved friends load with 0), and `profile.cardId`.
- The tab strip on Progress now scrolls sideways on a small phone instead of squeezing.

### Test readiness

- `data/catalog/freeskate-tests.json`: the free skate part of the 12 tests as short checklists (89 items), written from the 2026-27 Singles Test Requirements chart in our own words, with the maximum time and which adult test shares each standard one. A test checks that its ids match the 12 skating skills tests.
- `js/testprep.js`: skating skills readiness (a skill is earned at 4 skates or more by its latest rating, with the last five ratings), the free skate checklist (ticked by the skater, since MySkate cannot see a jump), the countdown (D-12, Tomorrow, Today, Passed), and which skills to work on first.
- The Tests tab: choose a test and a date, two rings, the skating skills (tap one for its history), a "Plan the ones not earned" button, and the checklist. Home has a Your test tile. Saved data: `profile.test` and `testChecks`.
- Limits to remember: the skating skills lists come from an undated checklist, and the free skate summary is ours. The page tells skaters to check the current rulebook and ask a coach.

### Practice calendar

- `js/calendar.js` and a card on the Progress overview: gold days for days skated, a blue dot for picked Ice sessions still to come, a ring on today, a glow behind weeks that count toward a streak, and a sheet for each day.

### Locked backups

- `js/crypto.js`: AES-256-GCM with a PBKDF2 (SHA-256, 600,000 rounds, random salt) key, in the browser's Web Crypto. The file records how it was locked and is checked before any work (so a hostile file with an absurd round count is refused at once). Me has Save a locked backup; restoring (from Me or the first-run sheet) notices a locked file and asks for the passphrase (a wrong one can be retried). A forgotten passphrase cannot be recovered and the sheet says so.
- The sheets for locking and unlocking, friends, badges, calendar days, and cost keep their buttons in view while they scroll on a small phone.

### Verified

- 146 tests pass in four time zones. New: friends (the code round trip, 20 kinds of bad input, links in addresses and in pasted messages, adding and updating and refusing, the board with ties, saving and old data); test readiness (the checklist data matches the tests and is well formed, earned skills by latest rating, last five ratings, the order to work on, ticks, the countdown, saving and merging); the calendar (weekday layout including leap years and a Sunday start, skated days, planned ice, streak weeks across months); locked backups (round trip, nothing readable in the file, wrong passphrase and tampering, 17 kinds of bad file refused quickly, accents, a 3 MB backup).
- In the browser: friend links while the app is open and when it is opened fresh, paste and update flows, the friend sheet and board, Home friend tile, the card picture; choosing a test and a date, ticking, planning, the Home tile; the calendar with dots, glow, a day sheet, and month arrows; locking a backup (and the short and mismatched passphrase messages), then restoring it with a wrong passphrase, the right one, and cancelling. No console errors. Phone widths 390 and 320: no sideways scrolling, buttons in view.

### Not verified

A real phone and Safari: the share sheet for a card link and picture, and the keyboard and password manager behaviour on the passphrase fields. A real friend on another phone opening a link. Locked backups on a very old browser (it needs Web Crypto, which every current browser has). Nothing is pushed.

---

## 2026-10-17 (Saturday, night): self-hosted fonts

### Planned

The last stretch item: stop loading the two typefaces from Google, so the app makes no outside request to draw its text and the type works offline. The owner said yes to downloading six files (name, source, and size were listed first).

### Changes

- Downloaded six files from `fonts.gstatic.com` into `fonts/` (the exact files Google Fonts served for these two families): Bodoni Moda regular and italic, each in the Latin and Latin Extended subsets, and Jost in the Latin and Latin Extended subsets. 192 KB in all, every file the size listed and a genuine woff2 (checked by its first four bytes). They are variable fonts, so each file covers every weight.
- `css/fonts.css` has the `@font-face` rules (the same weight ranges and unicode ranges Google used, `font-display: swap`). `index.html` and the style tile use it, the Google links are gone, and the two Latin files are preloaded. The Latin Extended files load only when a page uses those letters (checked with a name like Łukasz Čech).
- `fonts/README.md` records the source, the date, and the license: both are open fonts under the SIL Open Font License 1.1, with the copyright lines of the two projects. I did not add the license text file itself: the license is linked, and I do not have the text from the projects. Adding the project's `OFL.txt` next to the fonts would be the strict way to meet the license, and is a small download for the owner to approve.
- Four tests: no page or stylesheet points at Google's font servers, every rule points at a file that exists, the files are genuine woff2 within sensible sizes, and the README names the license.

### Verified

150 tests pass in two time zones. In the browser: all three used faces loaded from `/fonts/`, the page made no request outside its own site, the headings and body text look the same as before, the share picture still draws with the fonts, and there are no console errors.

### Not verified

Safari and a real phone. Nothing is pushed.

---

## 2026-10-17 (Saturday, late night): goals, coach homework, off-ice log, skater colors

### Planned

The owner picked four items from the Later list, in this order: goals with target dates, coach notes and homework, an off-ice training log, and a skater customizer. Left out on purpose: the 3D viewer (hand-built poses the skater would have to review) and accounts and cloud sync (a server).

### Goals

- `js/goals.js` and a card on Plan: a skill, a target rating (3, 4, or 5 skates), and an optional day. One goal per skill. Met by the latest rating (a bad day takes it back, as for a test), with the day it was reached remembered. Sorted by day, then how close you are. A goal you have already met cannot be set. Home has a tile for open goals; reaching goals earns two badges (Goal reached, Five goals).
- A reusable sheet (`js/ui/skillpick.js`) to find a skill by searching, also used by homework.

### Coach homework

- `js/homework.js` and a card on Plan: a note, an optional skill, an optional due day, a real checkbox, "Plan it" for a linked skill, a Done list that folds away with Clear done, and a Home tile. Two badges (Homework done, Five homeworks).

### Off-ice log

- `js/office.js`: stretching, strength, jump drills, dance, cardio, or other, 5 to 300 minutes, on today or earlier, with a note. It does not change XP or the streak. It earns three badges (Off-ice workout, Off-ice regular, Cross-trainer), puts a green dot on the calendar day (and lists it in the day sheet), and has a Home tile. The log and the button are on the Sessions tab of Progress.

### Skater colors

- `js/looks.js`: six colors for your avatar and card (two free, two by level, two by badge). Every color is tested for readable letters. They show on the friends board and on your card, a friend sees your color, and the card picture is tinted with it. A color you have not unlocked falls back to the default, so a file cannot put one on your card. Colors that carry meaning in the app (gold, blue, coral) are not on the list.

### Other

- Fixed a test of mine that could fail by chance (short words appearing in random-looking locked-backup text): it now looks for longer strings.
- The quick tour mentions goals and homework, and the off-ice log.
- All the new sheets keep their buttons in view on a small phone.

### Verified

183 tests pass in three time zones, with new tests for each piece: goals (cleaning, met by latest rating, the day met, countdown, order, one per skill, merging), homework (cleaning, ticking, order, overdue, clearing), the off-ice log (cleaning, future days refused, week totals, milestones, badges, the calendar marks), and colors (contrast, unlock rules, saving, cards, falling back). In the browser I set a goal, planned it, then reached it with a real session (the Goal reached badge came up with the level-up); added homework, planned it, ticked it, cleared it; logged off-ice work (bad minutes and a future day refused), saw the green dot and the day sheet; chose colors (a locked one refused with what unlocks it, one unlocked by levelling up, the avatar and friend avatars in their colors, the card picture). Every page and new sheet at 320 wide has no sideways scroll, with the buttons in view. No console errors.

### Not verified

A real phone and Safari. Nothing is pushed.

## 2026-10-17 (Saturday, night): the Fresh Ice redesign

### Plan

After the push and the live check, the skater said the look was not working: visual UI matters for getting someone excited to use the app. Look at the app on a phone, say honestly what is wrong, mock up directions, and rebuild the look in the direction they pick. Tagged the old look `before-redesign` first (local tag).

### What was wrong

- Every screen was the same tall stack of dark glass cards, all one weight, so nothing was the star. Home was about three and a half screens long, and it opened with two reminders (back up, plan a session) before any progress.
- The mood was dark and quiet. The bouncy, rewarding side only showed up in the celebrations.

### How the direction was chosen

- Round one (three Home mockups in a familiar habit-app style: a bright light theme, a spotlight on the level, a game-like skill path) was turned down: too familiar to apps people are bad at checking into daily.
- Round two borrowed from skating (a living ice sheet with a figure eight you trace, a printed program, a spotlit skate that fills with gold). Feedback: the ice was the favorite but its background squiggles looked bad; the printed program looked like homework; the skate looked cool but something was missing. The mockups were removed once the choice was made. The decision is written up under "Round four" in `ROADMAP.md`.

### Changes

- Fresh Ice: clean glossy ice under the low gold sun, type set on the ice with hairline rules instead of cards. Only sheets and toasts are surfaces, and they are dark and nearly solid. New buttons (an ice-white pill; gold for rewards; coral for ending or deleting; outline for the rest), outlined chips, plain-word tabs with a gold line, hairline bars with a bright bead at the end, words-only main tabs (a gold dot marks the current one; a list down the side on a desktop), and quiet gold links at the end of Home sections.
- Retired the squiggles: the background tracks drawn from the skater's skills (`js/ice-tracks.js`, `js/ui/ice.js`, `iceSkills` in `js/stats.js`), the scratch texture, the corner etching on tiles, and the generator script. Their tests went with them. The background is now clean ice with a low sun, a long sheen, a few sparkles, and a darker foot.
- Home is rebuilt around the week as a figure eight (`js/week.js` with tests, drawn by `js/ui/eight.js`): each session traces one loop, a whole eight means the week counts toward the streak, and the whole eight is the main button (STEP ON, PLAN IT, or BACK ON). A row of small gold eights shows the weeks in a row. Then three lines (level, next skill, blades), the other sections, recent sessions, and the backup reminder last. On a desktop the eight stays beside the lines.
- The other screens (Plan, Skate, Progress, Ice, Me), the sheets, the tour, and the celebrations pick up the new look through the shared styles. Skill titles on the Skate screen are lighter. The tour's streak step and picture now show the figure eight.
- `design/style-tile.html` is rebuilt from the app's own CSS and drawing code, so it cannot drift from the app. `tools/seed.html` (made-up data to look at any screen) and `tools/shot.mjs` (a screenshot at an exact phone or desktop size) are new.

### Verified

185 tests pass (179 before the figure eight; 4 track tests were removed with the squiggles and 6 week tests were added). Looked at every screen at 390 wide, Home and the style tile at 1280, the first-run sheet, the tour, both celebrations, a finished eight, an empty week, a session in progress, and high contrast, in headless Chrome. The tracing line is animated only when the week changes, and every animation has its reduced-motion off state.

### Not verified

A real phone and Safari. Not pushed. The faded `Skate` bottom buttons sit behind the tab fade until scrolled, as before.

## 2026-10-17 (Saturday, night): drafts, then the competition planner

### Plan

The skater turned down the Fresh Ice redesign ("this redesign does not fit well") and asked for rough drafts first, before anything else. Three rounds of Home drafts followed (ten, then a combination of drafts 3 to 9 plus ten more, then eight screens for a planner). The skater loved the rink diagram, choreography, marquee, kiss-and-cry, and Zamboni-day drafts, and suggested a section to create and plan a skate for the next competition. They chose to build that first, before changing the look of the rest of the app.

### What was built

- Logic (`js/compete.js`, with 26 tests): events (a competition, its day, a packing list, a result) and programs (music, length, kind, elements with a spot on the rink and a start and length in the music, notes on the music). Everything is cleaned on load, so a bad backup cannot break the screens. Countdowns, the skating season (July to June), ordinals (2nd of 9), running-order numerals (I., II., III.), overlaps, cues for a run-through, a smooth route through the marks, and the address of each view are all pure functions.
- Saved data: `events` and `programs`, optional and cleaned, so `schemaVersion` stays 1. A backup merge keeps yours by id and adds the rest, and a program only points at an event that exists.
- Screens (`js/screens/compete.js`): a hub (next competition as a marquee, programs with what is done, past competitions), a program editor with Setup, Layout, and Timing, a competition page (the day with the Zamboni in stripes, a packing list, attached programs), and a result form with a TV-style scoreboard. Each view has its own address (`#/compete/...`) so the back button works. The rink diagram (`js/ui/rink.js`) takes taps, drags, arrow keys, and nudge buttons. The run-through is a clock that calls out what is on now and what is next; it plays no music.
- A poster picture of a program (a marquee with your name in lights), drawn on the device and shared like the badge and friend card pictures.
- Home shows the next competition as a small marquee with days to go and how much of the program is planned; Plan has a card; the quick tour has a step. Competitions has no tab of its own (six tabs fit a small phone), and Plan stays lit while you are in it.
- Its own look (`css/compete.css`, scoped to the route): a burgundy glow, paper cards, a marquee with bulbs, a blueprint rink, and the button with the red offset shadow. The style tile shows it. The rough drafts are kept as `design/drafts*.html`, and `tools/seed.html` can load a believable competition (`?compete=1`, with `result=1` for a result).
- The planner never claims an event's rules. Length, elements, and times are only what the skater enters, with a reminder to check the event's rules and ask the coach. No scoring.

### Verified

213 tests pass in four time zones (the logic, the saved data and merge, and the tour). In a real browser (headless Chrome), I drove: dragging a mark, tapping a mark to select it, tapping empty ice to add an element where tapped, arrow keys keeping focus, reordering, nudging, editing starts and lengths (and bad ones being refused with a message), notes on the music, spread evenly, the run-through clock, the setup form, a bad length, creating a program and a competition, deleting both, a made-up address falling back to the hub, the day (add, edit, remove), the packing list, and recording, reading, editing and removing a result. Every planner screen at 320, 360, and 390 wide has no sideways scrolling and no console errors, and the desktop layout was looked at.

### Not verified

A real phone and Safari. Touch dragging on the rink uses `touch-action: none` on the marks; the nudge buttons and arrow keys are there if a browser ignores it on SVG. The poster's share sheet. Nothing is pushed: the Fresh Ice redesign (two local commits) is still in the history this builds on.

## 2026-10-17 (Saturday, late night): the stage look for the whole app

### Plan

The skater asked to restyle the rest of the app in the stage look (the look of the competition planner), so everything matches, and to push once it was checked. Tagged work stays local until the check passes.

### Changes

- Tokens and background: the colors are now the stage (a dark house, cream, gold, a red for the button's shadow). The background is a burgundy glow high in the middle, tinted by the Light of day setting. The sun, the sheen, the sparkles and the flecks are gone.
- Shared pieces: the main button is cream with a red offset shadow, in Bodoni italic, and you press into it; gold, coral, and outline (now a pill) buttons follow. Labels are small gold capitals; sections have a gold hairline; the glow lines are gold or cream; links are gold. Navigation is a dark bar with a gold line on top and a gold line under the current tab (a list down the side on a desktop). Each screen's heading is a gold line of small capitals over a Bodoni italic title.
- Home is rebuilt as a program: the date and season, "tonight, starring" over your name and a ghost of your level (the name steps down in size for longer names), a ticket for your next starred ice, a program sheet (your plan, or the skills MySkate suggests, with your last rating and goal), the button, then the week as the figure eight with a stub for each day (`weekStubs` in `js/week.js`, tested), a flap board for blades and level (`js/ui/flaps.js`), and the rest in quiet sections.
- Plan's panel is a paper program sheet. Plan, Skate, Progress, Ice, Me, the sheets, the tour, the first-run screen, and the celebrations pick the look up through the shared pieces.
- The style tile and the docs describe the stage.

### Verified

214 tests pass in four time zones. Looked at Home, Plan, Skate, Progress, Ice and Me at 390 wide, Home and Plan at 1280, and the tour, the first-run sheet, the level-up celebration, and the element sheet. Every screen at 320, 360, and 390 wide has no sideways scrolling and no console errors. Names from 3 letters to 30 fit at 320 wide.

### Not verified

A real phone and Safari. The Light of day settings other than golden hour were not looked at one by one.

## 2026-10-17 (Saturday, late night): final polish pass

### Plan

The skater asked for a last pass before the deadline: review the planner code, look at the Light of day settings, high contrast and reduced motion on the new look, and fix the stale ROADMAP lines. Push only if something needed fixing.

### Found and changed

- Midday's glow was too pale for the gold labels on it (contrast 4.0 against the 4.5 the rest of the app keeps); it is now a deeper blue (`--glow` in `css/tokens.css`). The other Light of day settings, high contrast and reduced motion held up.
- Two ROADMAP lines were out of date and now say what the app does.
- The planner's logic (`js/compete.js`): new marks are spread out instead of stacking when the rink is crowded (`nextSpot`); ids and skill ids from a backup are trimmed and limited; notes are cleaned the same way everywhere (`cleanNote`); a shorter piece of music can say which elements it would cut (`clipsAt`); a result is checked as a whole before it is saved (`checkResultDraft`, with `parseWhole` for the numbers: a placing bigger than the field is refused with a message instead of being quietly dropped).
- Editing a start, a length, the name or the music no longer rebuilds the whole screen. A rebuild swallowed the tap or the Tab that caused the change; now only the track, the totals, the header and the boxes are redrawn, and a box shows what was actually saved (a bad entry comes back as it was).
- Making the music shorter asks first if it would cut an element short.
- Deleting a program also clears it from any result that was marked against it; the results form follows the programs that still exist. Reordering with the buttons keeps focus on the button. Selecting a mark with Enter or Space keeps focus on it. What is typed into "what to bring" survives ticking an item.
- The rink: Cmd, Ctrl and Alt with an arrow key are left to the browser; a touch the system cancels (a call, a gesture) puts the mark back instead of saving a half drag; a finger that starts on a mark no longer scrolls the page.
- The poster no longer runs off the marquee: the skater's name, the program name and every line of information are fitted to the space (`js/textfit.js`, tested). A name stays whole words, shrinking before it is broken, and the information lines drop the least important first if there is no room.
- The screen lock (`js/wake.js`) is let go at once if the session ends while the browser is still deciding to grant it; it used to stay on.
- Merging a backup now says what it added besides sessions (goals, competitions, rinks, friends and so on), and says "You already had everything" only when that is true (`addedOther` in `mergeStates`).

### Verified

228 tests pass in four time zones. In a real browser (headless Chrome): the planner scripts for the rink (drag, tap, add, arrow keys, a cancelled drag, Cmd with an arrow), timing (a start keeps the same box in the page, a bad start comes back as saved, the totals and the track follow), the length (confirm and cancel, shorten, a bad length, the header following the name as it is typed), results (a placing bigger than the field refused, then saved), the packing list keeping typed text, deleting a program clearing the result's link, and the hub and the event page. Posters drawn for a short name, a very long name and program, and a single very long word: all fit inside the marquee. Every screen at 320, 360, and 390 wide has no sideways scrolling and no console errors. The timing tab was looked at at 390 and 1280.

### Not verified

A real phone and Safari: touch dragging on the rink, the share sheet, the wake lock. The merge message was covered by tests but not clicked through with a real backup file in the browser.

## 2026-10-17 (Saturday, late night): the tour becomes a guided practice run

### Plan

The skater asked for the tutorial to be interactive instead of a series of windows to read: keep the option to skip, add a sparkly path with words saying where to click and what it does, so the user learns by doing what the site does. Decided: the tour has to be real taps on the real screens, but it must not put made-up practice into the skater's own data, so it runs on a made-up copy (practice mode).

### Changes

- The old tour (a sheet of eight reading steps with pictures, `js/ui/tour.js` and its styles) is gone. In its place:
  - `js/tour.js` (pure, tested): 25 steps. Each is something to do (it moves on by itself when done, judged from the real state, so it works however the skater did it, or when the target is tapped) or a card to read with a Next button. The first lap is Home (your week), Plan (the slot, a skill, a jump), Start session, the clock, rating, counting a jump's tries, Next skill, End session, Save session, and the first loop of the eight. After that, if the skater wants more: Progress, Ice, Competitions, blade life, and backups, then a last card. A step that does not apply is skipped (no jump in the plan, no next skill). If the skater wanders (discards the session, empties the plan) the tour slips back to the step that makes sense, and if they do a later step another way it moves on.
  - `js/ui/coach.js` and `css/coach.css`: a spotlight ring on the thing to tap with a dotted path of sparkles from the card to it, and a dark card with the title, what to do and what it does, and "Skip tour". The card goes below the target, above it, or (for a tab in the side menu on a wide screen) beside it. A step inside a sheet (Save session) puts its words at the top of the sheet and rings the button, because a sheet sits above everything the tour can draw. Nothing blocks a tap. If a step's target is on another screen, it points at the tab that gets you back. With reduced motion the ring and the path stay and everything stops moving.
  - Practice mode (`ctx.beginPractice()` and `ctx.endPractice()` in `js/app.js`, `practiceState` in `js/tour.js`): the app shows a made-up copy of the data (name, levels, usual slot, blades, look, and light, but no sessions, plan, goals, or friends) and keeps none of it: `save()`, the backup buttons, badge celebrations, and level-up celebrations do nothing while it runs. The skater's own data is put back when the tour ends or is skipped, and any sheet the tour left open is closed. A gold strip across the top says "Practice · nothing is saved", and messages such as "Session saved" appear under it so they do not cover the card.
  - The first time (after setup) the tour is offered in a small sheet, "Learn it by doing", with Show me around and Skip for now; either counts as seen. Me (the Help card) and Home ("How MySkate works") start it directly.
- Also fixed: on a 320-wide phone the "Show me how MySkate works" button on Me was 21px too wide and made the page scroll sideways (it was there before). It now wraps.
- The style tile has a still of a tour step; ROADMAP and CLAUDE.md describe the tour and the rule that new code that saves data or interrupts with a celebration has to respect `ctx.practice`.

### Verified

241 tests pass in four time zones, including new ones for the steps (every step has a way to finish; every number the tour quotes and every button it names is real; every selector it points at still exists in the screens, so renaming a control breaks a test), the rules (done, skipped, slipped back, moved on), a pretend walk through the whole first session, and practice data sharing nothing with real data. In a real browser (headless Chrome) with made-up data, empty and full (13 sessions): the whole tour driven with real clicks from Welcome to the last card; afterwards the stored data was byte for byte what it was before, practice mode was off, and there were no console errors. Skipping from the Plan step and from inside the Save sheet left the stored data unchanged and closed the sheet; discarding the practice session sent the tour back to Start session. The first-time offer: Skip for now marks it seen and starts nothing, Show me around starts it. Every step at 390x844, 360x640, 1280x800 and (mostly) 320x568 and a phone held sideways (844x390): the card stays on screen and, apart from a few big targets on the smallest screens, off the thing to tap; no sideways scrolling. Looked at in high contrast, midday light, and reduced motion.

### Not verified

A real phone and Safari (the tour was checked in headless Chrome only: smooth scrolling to the target, the sparkle animation, and the sheet step). A screen reader (the step is announced through a live region, but it was not listened to). On the smallest phones and sideways, the card covers part of a large target (the figure eight) and a few wide ones.
