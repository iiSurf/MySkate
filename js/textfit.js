/* Fitting words into a space. The caller says how wide text is (a canvas measures it), so this stays pure and testable. Used by the
   poster picture, where a name can be short or very long. */

/* The text broken into lines no wider than maxWidth, at spaces. A single word wider than the space is broken between letters. */
export function breakLines(text, maxWidth, measure) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (measure(test) <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    let rest = word;
    while (measure(rest) > maxWidth && rest.length > 1) {
      let n = rest.length - 1;
      while (n > 1 && measure(rest.slice(0, n)) > maxWidth) n--;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

/* The biggest of the sizes (listed biggest first) at which the text fits in maxLines lines of maxWidth. measure(text, size) is the
   width. A size at which a word has to be broken between letters is passed over for a smaller one if any smaller size keeps every word
   whole; only if none does is a broken word accepted. If even the smallest size does not fit, the lines are cut to maxLines and the
   last one ends in an ellipsis. Returns { size, lines, cut }. */
export function fitLines(text, { maxWidth, maxLines = 1, sizes, measure }) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const wholeAt = (size) => words.every((w) => measure(w, size) <= maxWidth);
  for (const wholeWords of [true, false]) {
    for (const size of sizes) {
      if (wholeWords && !wholeAt(size)) continue;
      const lines = breakLines(text, maxWidth, (t) => measure(t, size));
      if (lines.length && lines.length <= maxLines) return { size, lines, cut: false };
    }
  }
  const size = sizes[sizes.length - 1];
  const all = breakLines(text, maxWidth, (t) => measure(t, size));
  const lines = all.slice(0, maxLines);
  if (!lines.length) return { size, lines: [""], cut: false };
  let last = lines[lines.length - 1];
  if (all.length > maxLines) last += "…";
  while (measure(last, size) > maxWidth && last.length > 1) last = last.slice(0, -2).trimEnd() + "…";
  lines[lines.length - 1] = last;
  return { size, lines, cut: all.length > maxLines || last.endsWith("…") };
}
