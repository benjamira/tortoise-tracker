/** ISO date (or datetime) → German "dd.mm.yyyy". Empty/invalid → "–". */
export function formatDate(value?: string | null): string {
  if (!value) return "–";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

/** Weight in grams, German formatting, up to one decimal (comma). */
export function formatWeight(value?: number | null): string {
  if (value == null) return "–";
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} g`;
}

/** Parse a user-typed weight ("830,5" or "830.5") to a number with one decimal. */
export function parseWeight(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}
