# MySkate

A figure skating practice tracker. Plan a session before you skate, log it at the rink from your phone, and watch your progress build: skate ratings, landed-jump percentages, ice time, blade life, XP, levels, and streaks. Your data stays on your device.

Live: https://iisurf.github.io/MySkate/

## What it does

- **Plan.** Pick your ice slot (30, 45, 60, 75, 90, or 120 minutes, or your own) and the skills to work on. MySkate suggests what to try next and shares the slot across your skills.
- **Skate.** A clock that counts only your time on ice and cannot drift, one skill at a time, a one to five skate rating, notes, and a landed or missed counter for jumps.
- **Progress.** Time on ice by week, level progress, every skill you have tried, and every session.
- **XP and levels.** XP rewards time, practice, personal bests, and earning skills, with a level-up celebration and weekly streaks.
- **Blade life.** Set your own sharpening interval (20, 25, 30, 35 hours, or any number). Your on-ice time counts toward it.
- **Your ice.** The background draws each skill's marks as you rate it: swizzles weave, three-turns leave tiny 3s, jumps leave a takeoff and landing, spins leave spirals.
- **Skill lists.** Learn to Skate USA Basic 1-6, Pre-Free Skate and Free Skate 1-6, Adult 1-6, U.S. Figure Skating Skating Skills tests, and a jump, spin, and element library.
- **Backups.** Save a JSON backup, export a CSV for a spreadsheet, and restore by merging or replacing. Nothing is uploaded anywhere.

Skill lists are summarized from public curricula and may differ from your coach or club. Always follow your coach.

## Run it locally

No build step. From this folder:

```bash
python3 tools/serve.py
```

Then open http://localhost:8000. (Python's built-in `http.server` can drop connections while the browser loads the app's modules, so use `tools/serve.py`.)

## Tests

The logic (saved data, XP, progress, blade life, timer, planning, ice patterns) has tests that run with Node's built-in test runner:

```bash
npm test
```

## How it is built

Plain HTML, CSS, and JavaScript modules. No framework, no server, no accounts, no tracking.

- `index.html`, `css/`, `js/`: the app. `js/screens/` has one file per screen, `js/ui/` the shared pieces.
- `data/catalog/`: the skill lists as JSON. Skill ids never change, because saved data refers to them.
- `assets/`: the skate illustration and the ice art. `design/` holds the style tile, the skate lab, and the scripts that generate the ice art.
- `ROADMAP.md` is the plan, `LOG.md` records what changed, and `CLAUDE.md` guides AI-assisted work in this repo.

Built with Claude Code for TCSS 490, Artifact 2.
