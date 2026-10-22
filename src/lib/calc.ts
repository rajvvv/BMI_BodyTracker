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

/** Parse a user-typed number, returning null for blank/invalid. */
export function num(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}
