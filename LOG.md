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
