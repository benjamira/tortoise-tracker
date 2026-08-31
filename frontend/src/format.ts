/** ISO date (or datetime) → German "dd.mm.yyyy". Empty/invalid → "–". */
export function formatDate(value?: string | null): string {
  if (!value) return "–";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}
