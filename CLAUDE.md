# MySkate

A figure skating practice tracker. Plan a session before you skate, log it at the rink from a phone, and watch progress build: ratings per skill, landed-jump percentages, ice time, XP, levels, and streaks. The owner (GitHub: iiSurf) is also its first user, currently working on Learn to Skate USA Pre-Free Skate.

This is Artifact 2 for TCSS 490. Due Sunday 2026-10-18, 11:59pm. The Canvas submission is the Portfolio link, not this repo.

- Live site: https://iisurf.github.io/MySkate/ (GitHub Pages, deploys from `main`, root folder). The path is case-sensitive.
- Portfolio card: edit the Artifact 2 entry in `cards.js` in github.com/iiSurf/Portfolio. Set `status` to "done" and fill `title`, `link`, `linkLabel`, `reflection`.

## Stack and constraints

- Plain HTML, CSS, and JavaScript (ES modules). No build step, no framework, no server.
- All user data lives in the browser (local storage) with JSON backup and restore. No accounts, no analytics, no third-party trackers.
- Phone first (design at 390px wide), with a roomier desktop layout (1280px).
- Run locally with `python3 tools/serve.py` (fetching the JSON catalog needs a server, not `file://`). Do not use `python3 -m http.server`: it drops connections while the browser loads the module graph and the page stays blank. `tools/serve.py` also sends no-cache headers.
- Run `npm test` before committing changes to `js/` logic. Tests use Node's built-in runner and read the real catalog from disk.

## Where things are

- `ROADMAP.md` is the source of truth for scope: Must, Stretch, Later, plus feature notes and design direction.
- `LOG.md` records what was planned and what changed, newest entry last.
- `data/catalog/*.json` holds the skill lists. Skill ids are permanent: saved user data refers to them, so never rename an id.
- `css/` holds the shared look: `tokens.css` (colors, type, spacing, and the Light of day tints of the navy band), `base.css` (reset and the floor), `components.css` (the offset button, chips, tabs, bars, star rating, level-up celebration), `app.css` (layout, navigation, Home, and the screens), `compete.css` (the planner's pieces: marquee, paper, rink, scoreboard), `coach.css` (the guided tour: spotlight, sparkle path, card), `rink.css` (loaded last: the clean rink look of every shared piece, Home's groups, and the cheers). Use the tokens; do not hardcode colors.
- `assets/skate.svg` holds the skate and blade illustrations (symbols `skate` and `blade`). `design/skate-lab.html` previews the skate.
- `js/ice.js` is the pure logic for Ice times (rinks, sessions, the week, filters, My picks, calendar import and export). Weekdays are numbered 1 (Monday) to 7 (Sunday), and times are wall-clock "HH:MM" strings with no time zone, because a rink's schedule is in the rink's own time. `js/screens/ice.js` is the Ice tab.
- `js/cost.js` is the pure logic for ice cost (a missing cost is unknown, not free). `js/badges.js` works out every badge from the saved sessions, like XP, and never stores them (only `profile.badgesSeen`, so celebrations happen once).
- `js/friends.js` (friend cards and the board), `js/testprep.js` (test readiness; its checklists are `data/catalog/freeskate-tests.json`, a short summary of the 2026-27 Singles chart), `js/calendar.js` (the practice calendar), and `js/crypto.js` (passphrase-locked backups), `js/goals.js`, `js/homework.js`, `js/office.js` (the off-ice log), and `js/looks.js` (skater colors) are pure logic with tests. A card holds only a name, level, XP, streak, badge count, and hours: keep it that way.
- `js/week.js` is the pure logic for the figure eight on Home (`js/ui/eight.js` draws it): each session of the week traces one loop, a whole eight means the week counts toward the streak, and the week's stubs mark the days you skated. It has tests. `js/ui/flaps.js` draws the flap tiles.
- `js/compete.js` is the pure logic for the competition planner (events, programs, elements, rink spots, timing, results, and the address of each view), with tests. `js/screens/compete.js` is the Competitions screens, `js/ui/rink.js` the rink diagram, `js/ui/competesheets.js` its sheets and the run-through clock, and `css/compete.css` its pieces (the marquee, paper cards, the rink, and the scoreboard). It never claims an event's rules: everything is what the skater enters.
- `js/tour.js` is the pure logic for the guided tour (its steps, what each asks the skater to do, how it moves on or slips back, and `practiceState`), with tests. `js/ui/coach.js` draws it. The tour runs in practice mode: `ctx.beginPractice()` swaps in a made-up copy of the data, `ctx.save()` and the backup, badge, and level-up code do nothing while `ctx.practice` is set, and `ctx.endPractice()` puts the real data back. Anything new that writes data or interrupts with a celebration has to respect `ctx.practice`. A button the tour points at is found by a selector in `js/tour.js`; a test checks every one still exists, so renaming a control means updating the tour.
- `design/style-tile.html` is the living look-and-feel reference. It uses the app's own CSS and drawing code, so a change to a component shows there too. Open it through the local server.
- `tools/seed.html` fills the browser with made-up data and jumps to a screen (`?s=full&r=home`), and `tools/shot.mjs` takes a screenshot at an exact phone or desktop size with headless Chrome. Together they are how to check a screen at 390 and 1280 wide.
- Layout: `index.html`, `css/`, `js/` (pure logic in `js/*.js`, screens in `js/screens/`, shared UI in `js/ui/`), `data/catalog/`, `assets/`, `design/`, `tests/`, `tools/`.
- Screens build markup with the `html` template tag in `js/util.js`, which escapes everything interpolated. Never build markup from untrusted text (backup files, notes, names) any other way.

## Working agreements

- Plan before building anything large. Keep changes small and commit after each working step with a clear message.
- Add a dated entry to `LOG.md` after each meaningful change: what was planned, what changed, what was verified.
- Check the result in a browser at phone width and desktop width before calling a feature done. Say what was not checked.
- Changing the shape of saved data bumps `schemaVersion` and adds a migration. Restoring an old backup must always keep working. Adding an optional field that `sanitizeState` gives a default (like `profile.tourSeen`) needs no bump, because older backups simply load with the default and older apps ignore it. Renaming, removing, or changing what a field means does need one.
- Never commit PDFs or other copyrighted source documents. Catalog files are our own lists with a link to the source.
- No secrets, tokens, or personal data in the repo.
- Respect `prefers-reduced-motion`: every animation has an off state.
- Ratings are self-scored, so XP rewards effort and improvement more than raw star counts.

## Design

The clean rink (October 2026, after phone testing at the rink). Ice-white cards with a soft edge on a soft white floor, navy ink, and a navy band at the top of each screen (the Light of day setting tints the band). Easy to read at a glance by the boards: one sturdy typeface, no hairlines, no thin strokes, body text 17px, a high contrast mode. Home is in two groups under the band: Your next move first (the one card with the one button that does the next thing), then Tonight (the week as the figure eight you trace, with a circle for each day, your next ice as a ticket, the practice list, the next competition) and Your progress (badges with a bar, all time on your skates, the skill to try next, then blade life, homework, goals, a test, off-ice, friends, ice times, levels, time on the ice, cost, recent sessions, and the backup reminder). The tabs are Home, Ice times, Plan, Skate, Progress, Profile, each with an icon. Ratings are stars; the skate picture marks an earned skill. The voice stays playful ("Clean skate!", "Fresh edges!"). Bouncy rewards stay: the level-up and badge celebrations, springy buttons, and quick skating cheers for finishing things (`cheer` in `js/ui/celebrate.js`). The competition marquee and the TV scoreboard keep their dark look. The font is Atkinson Hyperlegible Next, self-hosted in `fonts/` (`css/fonts.css` has the rules, `fonts/README.md` the source and license), so the app makes no outside request: do not add a link to Google Fonts. `css/rink.css` is loaded last and sets the final look of every shared piece. Color has jobs: blue is learning, gold is earned, coral is caution, and red is only the button's shadow and stamps. The stage look before this is kept at the git tag `before-zamboni`. Details are in `ROADMAP.md`.
