// Subsequence match with a light contiguity bonus. Returns null if no match.
export function score(label, q) {
  if (!q) return 0;
  const s = label.toLowerCase();
  const query = q.toLowerCase();
  let si = 0, points = 0, streak = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const found = s.indexOf(query[qi], si);
    if (found === -1) return null;
    streak = found === si ? streak + 2 : 0;
    points += 1 + streak;
    if (found === 0) points += 3; // prefix bonus
    si = found + 1;
  }
  return points;
}

export function filterCommands(commands, q) {
  if (!q) return [...commands];
  return commands
    .map((c) => ({ c, s: score(c.label, q) }))
    .filter((x) => x.s !== null)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}
