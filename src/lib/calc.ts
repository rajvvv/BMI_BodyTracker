// Calculations the app can do from weight / height / age / sex.
// (Body-fat %, visceral fat, muscle mass, body age and TSF come from the
//  machine's impedance reading and are entered by hand — they cannot be
//  derived from these numbers.)

/** Body Mass Index = kg / m^2. Returns null if inputs are missing/invalid. */
export function calcBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export type BmiBand = { label: string; color: string };

/** WHO BMI category for the given value. */
export function bmiBand(bmi: number | null): BmiBand {
  if (bmi == null) return { label: '—', color: '#94a3b8' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
  if (bmi < 25) return { label: 'Normal', color: '#22c55e' };
  if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
  return { label: 'Obese', color: '#ef4444' };
}

/**
 * Basal Metabolic Rate (kcal/day), Mifflin–St Jeor equation.
 * Shown as a reference estimate; the machine's own BMR/RM can still be stored.
 */
export function calcBmr(
  weightKg: number | null,
  heightCm: number | null,
  ageYears: number | null,
  sex: 'male' | 'female',
): number | null {
  if (!weightKg || !heightCm || ageYears == null) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/** Whole-year age from a YYYY-MM-DD date of birth. */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type Series = { v: number; at: string };

export type SeriesStats = {
  first: number;
  last: number;
  min: number;
  max: number;
  avg: number;
  change: number;
  perWeek: number | null;
  count: number;
};

/** Summary analytics for a chronologically-ordered metric series. */
export function seriesStats(points: Series[]): SeriesStats | null {
  if (!points.length) return null;
  const vals = points.map((p) => p.v);
  const first = points[0].v;
  const last = points[points.length - 1].v;
  const change = round1(last - first);
  const t0 = new Date(points[0].at).getTime();
  const t1 = new Date(points[points.length - 1].at).getTime();
  const weeks = (t1 - t0) / (7 * 86_400_000);
  return {
    first,
    last,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: round1(vals.reduce((a, b) => a + b, 0) / vals.length),
    change,
    perWeek: weeks >= 0.5 ? round1(change / weeks) : null,
    count: points.length,
  };
}

/** True if an ISO timestamp falls within the last `months` (null = all time). */
export function withinMonths(iso: string, months: number | null): boolean {
  if (months == null) return true;
  return new Date(iso).getTime() >= Date.now() - months * 30 * 86_400_000;
}

/** Date -> 'YYYY-MM-DD' (local), for date columns. */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' (or any parseable date string) -> Date, or null. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse a user-typed number, returning null for blank/invalid. */
export function num(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}

export type GoalProgress = {
  pct: number; // 0..100, clamped
  remaining: number; // how far still to go (in the metric's unit), >= 0
  reached: boolean;
  startValue: number;
  currentValue: number;
  target: number;
};

/**
 * Progress from a starting value toward a target, given the latest value.
 * Works whether the goal is to go down (weight/fat loss) or up (muscle).
 */
export function goalProgress(
  start: number | null,
  current: number | null,
  target: number | null,
): GoalProgress | null {
  if (start == null || current == null || target == null) return null;
  const total = target - start;
  const done = current - start;
  // If the member started exactly at target, they only count as "reached"
  // while still there — otherwise a later gain would still show 100%.
  const pctRaw = total === 0 ? (current === target ? 100 : 0) : (done / total) * 100;
  const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));
  const remaining = Math.max(0, Math.round(Math.abs(target - current) * 10) / 10);
  const reached =
    (total === 0 && current === target) ||   // started at target AND still there
    (total < 0 && current <= target) ||       // goal was to decrease
    (total > 0 && current >= target);         // goal was to increase
  return {
    pct: reached ? 100 : pct,
    remaining: reached ? 0 : remaining,
    reached,
    startValue: start,
    currentValue: current,
    target,
  };
}
