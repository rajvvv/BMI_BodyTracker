export type Role = 'admin' | 'instructor';
export type Sex = 'male' | 'female';

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Member = {
  id: string;
  full_name: string;
  sex: Sex;
  date_of_birth: string | null;
  height_cm: number;
  join_date: string;
  phone: string | null;
  notes: string | null;
  instructor_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type Measurement = {
  id: string;
  member_id: string;
  measured_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  visceral_fat: number | null;
  muscle_mass_kg: number | null;
  bmr: number | null;
  body_age: number | null;
  tsf: number | null;
  bmi: number | null;
  recorded_by: string | null;
  created_at: string;
};
