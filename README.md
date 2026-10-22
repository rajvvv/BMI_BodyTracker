# BodyTrack — Fitness Center Body-Composition Tracker

A mobile app (iOS + Android) for a fitness center. Instructors log in, add members,
and record each machine weigh-in (weight, body-fat %, visceral fat, muscle mass,
BMR/RM, body age, TSF). BMI and a BMR estimate are calculated automatically. Every
member has a history with **progress charts**.

Built with **Expo (React Native) + TypeScript** and **Supabase** (cloud database,
login, and role-based access).

---

## One-time setup

### 1. Create the cloud backend (Supabase)

1. Go to <https://supabase.com> and create a free account + a new project.
2. In the project dashboard, open **SQL Editor → New query**, paste the whole of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
   `profiles`, `members`, and `measurements` tables and the security rules.
3. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
4. Paste both into [`src/lib/config.ts`](src/lib/config.ts).

> Tip: while testing, you can turn off email confirmation in Supabase under
> **Authentication → Providers → Email** so new instructor accounts work instantly.

### 2. Run the app

```bash
npm install          # if you haven't already
npx expo start
```

- Install **Expo Go** on your phone (App Store / Play Store).
- Scan the QR code shown in the terminal. The app opens on your phone.

### 3. Create accounts

- Tap **Create an account** and sign up each instructor.
- To make yourself the **admin**, sign up once, then run this in the Supabase SQL
  editor (replace the email):

  ```sql
  update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'you@example.com');
  ```

---

## What works now (MVP)

- Instructor sign up / sign in (cloud, shared across all instructors)
- Add / edit members (name, sex, DOB, height, phone, notes)
- Search members
- Record a reading; **BMI auto-calculated**, BMR estimate shown
- Member screen: latest reading tiles, **trend charts** (weight, BMI, fat %, muscle,
  visceral fat), full history
- Roles: admin vs. instructor (admins can delete)

## Metrics note

Weight, age, and height are entered; **BMI** and the **BMR estimate** are computed
from them. **Body-fat %, visceral fat, muscle mass, body age, and TSF** come from the
machine's impedance sensor and are typed in from its display — they can't be
calculated from height/weight alone.

## Project layout

```
App.tsx                     app entry, navigation, auth gate
src/lib/config.ts           <-- put your Supabase URL + anon key here
src/lib/supabase.ts         Supabase client
src/lib/calc.ts             BMI / BMR / age helpers
src/lib/types.ts            shared TypeScript types
src/context/AuthContext.tsx login session + profile
src/screens/                Auth, Members, AddMember, MemberDetail, AddMeasurement
src/components/ui.tsx        Button, Field, Card, StatTile
supabase/schema.sql         run this once in Supabase
```
