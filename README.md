# MySkate

A figure skating practice tracker. Plan a session before you skate, log it at the rink from your phone, and watch your progress build: skate ratings, landed-jump percentages, ice time, blade life, XP, levels, and streaks. Your data stays on your device.

Live: https://iisurf.github.io/MySkate/

## What it does

- **Ice times.** Put your rinks' weekly sessions on one page: add each rink and its sessions once (or import a calendar file), star the ones you want, and see them together for the week. Filter by type and rink, switch to My picks, and see what overlaps. Calendar files (.ics, including ones from Google Calendar) can be uploaded, and a newer file updates a rink's sessions. Only today and later are kept. Home shows your next ice.
- **Plan.** Pick your ice slot (30, 45, 60, 75, 90, or 120 minutes, or your own) and the skills to work on. MySkate suggests what to try next and shares the slot across your skills.
- **Skate.** A clock that counts only your time on ice and cannot drift, one skill at a time, a one to five skate rating, notes, and a landed or missed counter for jumps.
- **Progress.** Time on ice by week, level progress, every skill you have tried, and every session.
- **XP and levels.** XP rewards time, practice, personal bests, and earning skills, with a level-up celebration and weekly streaks.
- **Friends.** Send your card as a link (name, level, XP, streak, badges, hours) and add your friends' cards, then see a board of everyone. Cards hold nothing else and never go through a server.
- **Test readiness.** Pick the test you are working toward and see days to go, your skating skills against it, and a free skate checklist (a short summary of the 2026-27 chart; check the rulebook).
- **Goals and homework.** Set a rating goal for any skill with a day, and keep your coach's homework as a list to tick off, both on the Plan screen.
- **Off-ice log.** Log stretching, strength, jump drills, dance, or cardio. It counts toward badges and shows on the calendar.
- **Your color.** Pick the color of your avatar and card, with more colors unlocking as you level up and earn badges.
- **Practice calendar.** A month of the days you skated, the ice you picked ahead, and your streak weeks.
- **Badges.** 29 badges, from your first session to a marathon of ice time, in a trophy case on Progress. Each one shows the day you earned it and how many sessions it took, and you can share a picture of it.
- **Ice cost.** Add what each session cost (or set your usual cost). See it by month, per session, and per hour on ice.
- **Blade life.** Set your own sharpening interval (20, 25, 30, 35 hours, or any number). Your on-ice time counts toward it.
- **Your ice.** The background draws each skill's marks as you rate it: swizzles weave, three-turns leave tiny 3s, jumps leave a takeoff and landing, spins leave spirals.
- **Skill lists.** Learn to Skate USA Basic 1-6, Pre-Free Skate and Free Skate 1-6, Adult 1-6, U.S. Figure Skating Skating Skills tests, and a jump, spin, and element library.
- **Quick tour.** Six short steps with pictures explain planning, skating, rating, XP, blade life, and backups. It opens once when you first set up, and any time from the Help card on Me.
- **Backups.** Save a JSON backup (optionally locked with a passphrase), export a CSV for a spreadsheet, and restore by merging or replacing. Nothing is uploaded anywhere.

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
- `fonts/` and `css/fonts.css`: the two typefaces (Bodoni Moda and Jost), self-hosted, so the app makes no outside request for them and the type works offline.
- `assets/`: the skate illustration. `design/` holds the style tile (built from the app's own CSS) and the skate lab. `tools/` has the local server and two helpers for checking screens.
- `ROADMAP.md` is the plan, `LOG.md` records what changed, and `CLAUDE.md` guides AI-assisted work in this repo.

Built with Claude Code for TCSS 490, Artifact 2.
