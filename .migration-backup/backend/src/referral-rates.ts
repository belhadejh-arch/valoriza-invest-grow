/** Existing settings contain both decimal fractions (0.08) and percentages (8). */
export function referralRate(value: unknown, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return parsed >= 1 ? parsed / 100 : parsed;
}
