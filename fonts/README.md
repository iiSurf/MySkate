# Fonts

MySkate draws its text with two typefaces, served from this folder instead of from Google, so the app makes no outside request for them and works offline.

| Files | Typeface | Used for |
|---|---|---|
| `bodoni-moda-latin.woff2`, `bodoni-moda-latin-ext.woff2`, `bodoni-moda-italic-latin.woff2`, `bodoni-moda-italic-latin-ext.woff2` | Bodoni Moda (variable: weights 400 to 900, optical size) | Big moments and numbers (about 28 px and up) |
| `jost-latin.woff2`, `jost-latin-ext.woff2` | Jost (variable: weights 300 to 800) | Everything else |

- Source: the font files Google Fonts serves for these two families (`fonts.gstatic.com`, Bodoni Moda v28 and Jost v20), downloaded on 2026-10-17, with the Latin and Latin Extended subsets only.
- License: both are open fonts under the SIL Open Font License 1.1 (https://openfontlicense.org), as every font on Google Fonts is open-licensed. Bodoni Moda: Copyright 2020 The Bodoni Moda Project Authors (https://github.com/indestructible-type/Bodoni). Jost: Copyright 2020 The Jost Project Authors (https://github.com/indestructible-type/Jost). The fonts are used as they are, unmodified.
- The `@font-face` rules are in `css/fonts.css`. The Latin Extended files load only when a page uses letters from that range.
