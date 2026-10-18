# Fonts

MySkate draws its text with one typeface, served from this folder instead of from Google, so the app makes no outside request for it and works offline.

| Files | Typeface | Used for |
|---|---|---|
| `atkinson-next-latin.woff2`, `atkinson-next-italic-latin.woff2` | Atkinson Hyperlegible Next (variable: weights 200 to 800, upright and italic) | Everything |

- Why: it was made by the Braille Institute to be read at a glance, which suits a phone glanced at by the boards of a rink. It replaced Bodoni Moda and Jost in October 2026, whose thin strokes were hard to read there.
- Source: the font files Google Fonts serves for this family (`fonts.gstatic.com`, Atkinson Hyperlegible Next v7), downloaded on 2026-10-18, Latin subset only.
- License: SIL Open Font License 1.1 (https://openfontlicense.org). Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next). The full license is in `OFL-atkinson-hyperlegible-next.txt`. The fonts are used as they are, unmodified.
- The `@font-face` rules are in `css/fonts.css`.
