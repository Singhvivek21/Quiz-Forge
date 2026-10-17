/** Format a date string to a human-readable relative label */
export function relativeDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Clamp a value between min and max */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Truncate a string to maxLen characters */
export const truncate = (str, maxLen = 60) =>
  str.length > maxLen ? str.slice(0, maxLen).trimEnd() + '…' : str;

/** Return a CSS colour class based on score */
export function scoreColour(score) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}

/** Return difficulty badge colour */
export function difficultyColour(difficulty) {
  return { easy: 'green', medium: 'yellow', hard: 'red', mixed: 'blue' }[difficulty?.toLowerCase()] ?? 'default';
}
