import { getLang } from "./i18n/state";

const NUMBER_LOCALE: Record<string, string> = { de: "de-DE", en: "en-GB" };

function locale(): string {
  return NUMBER_LOCALE[getLang()] ?? "de-DE";
}

/** ISO date (or datetime) → locale-formatted date. Empty/invalid → "–". */
export function formatDate(value?: string | null): string {
  if (!value) return "–";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(locale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Weight in grams, locale-formatted, up to one decimal. */
export function formatWeight(value?: number | null): string {
  if (value == null) return "–";
  return `${value.toLocaleString(locale(), { maximumFractionDigits: 1 })} g`;
}

/** Parse a user-typed weight ("830,5" or "830.5") to a number with one decimal. */
export function parseWeight(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}
