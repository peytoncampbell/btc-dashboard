/** Safe number conversion — never returns null/undefined/NaN */
export function n(v: unknown, d = 0): number {
  if (v === null || v === undefined) return d;
  const num = Number(v);
  return isNaN(num) ? d : num;
}
