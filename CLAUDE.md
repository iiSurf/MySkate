# MySkate

A figure skating practice tracker. Plan a session before you skate, log it at the rink from a phone, and watch progress build: ratings per skill, landed-jump percentages, ice time, XP, levels, and streaks. The owner (GitHub: iiSurf) is also its first user, currently working on Learn to Skate USA Pre-Free Skate.

This is Artifact 2 for TCSS 490. Due Sunday 2026-10-18, 11:59pm. The Canvas submission is the Portfolio link, not this repo.

- Live site: https://iisurf.github.io/MySkate/ (GitHub Pages, deploys from `main`, root folder). The path is case-sensitive.
- Portfolio card: edit the Artifact 2 entry in `cards.js` in github.com/iiSurf/Portfolio. Set `status` to "done" and fill `title`, `link`, `linkLabel`, `reflection`.

## Stack and constraints

- Plain HTML, CSS, and JavaScript (ES modules). No build step, no framework, no server.
- All user data lives in the browser (local storage) with JSON backup and restore. No accounts, no analytics, no third-party trackers.
- Phone first (design at 390px wide), with a roomier desktop layout (1280px).
- Run locally with `python3 -m http.server 8000` (fetching the JSON catalog needs a server, not `file://`).

## Where things are

- `ROADMAP.md` is the source of truth for scope: Must, Stretch, Later, plus feature notes and design direction.
- `LOG.md` records what was planned and what changed, newest entry last.
- `data/catalog/*.json` holds the skill lists. Skill ids are permanent: saved user data refers to them, so never rename an id.
- Planned layout: `index.html`, `css/`, `js/`, `data/catalog/`.

## Working agreements

- Plan before building anything large. Keep changes small and commit after each working step with a clear message.
- Add a dated entry to `LOG.md` after each meaningful change: what was planned, what changed, what was verified.
- Check the result in a browser at phone width and desktop width before calling a feature done. Say what was not checked.
- Changing the shape of saved data bumps `schemaVersion` and adds a migration. Restoring an old backup must always keep working.
- Never commit PDFs or other copyrighted source documents. Catalog files are our own lists with a link to the source.
- No secrets, tokens, or personal data in the repo.
- Respect `prefers-reduced-motion`: every animation has an off state.
- Ratings are self-scored, so XP rewards effort and improvement more than raw star counts.

## Design

Fun and polished, in the spirit of Duolingo's friendliness and Apple's clarity, with subtle nods to the Portfolio site (dusk navy, ice-cyan glow, Unbounded plus Nunito fonts). Calmer than the Portfolio: one glow per screen, faint ice-carve lines in the background, chunky rounded buttons. Details are in `ROADMAP.md`.
