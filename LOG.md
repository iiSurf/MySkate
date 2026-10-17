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

Owner reviews the style tile. Then build the app shell (index.html, JavaScript modules) that loads the catalog, followed by the level picker and the plan screen, and the Pages deploy.
