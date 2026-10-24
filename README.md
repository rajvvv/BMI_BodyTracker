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

## What works now

- Instructor sign up / sign in (cloud, shared across all instructors)
- Home dashboard: member count + readings-this-month; **sort** by name / recent /
  newest, with a **"last seen"** indicator per member
- Add / edit members (name, sex, DOB via **date picker**, height, phone, notes) and
  optional **goals** (target weight / target body-fat %)
- Search members
- Record a reading with a **date picker** (back-date past weigh-ins); **BMI
  auto-calculated**, BMR estimate shown live; **edit or delete** any past reading
  (tap it in History)
- Home dashboard: members / active-30d / readings-per-month tiles + a **6-month
  readings bar chart**
- Member screen: latest reading tiles, **goal-progress bars**, and a **progress &
  analytics** section — custom chart with gradient fill + average line, a
  **1M/3M/6M/All period filter**, and trend stats (current, change with ▲▼,
  per-week rate, lowest / highest / average) per metric
- **Share a formatted PDF progress report** (brand header, goal bars, weight-trend
  chart, full history table) → share sheet
- Success **toasts**; roles: admin vs. instructor; **admins can delete members**
- **Profile screen** (tap your avatar, top-right): edit your display name, see your
  role, email, and how many members/readings you've logged, and sign out
- Icons throughout, slide transitions between screens (no white flash)

> **Database update:** these features added columns + a trigger. Re-run
> [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor once (it's
> idempotent — the "MIGRATION 002" block at the bottom applies the changes).

## Metrics note

Weight, age, and height are entered; **BMI** and the **BMR estimate** are computed
from them. **Body-fat %, visceral fat, muscle mass, body age, and TSF** come from the
machine's impedance sensor and are typed in from its display — they can't be
calculated from height/weight alone.

## Project layout

Navigation uses **Expo Router** — every file in `src/app/` is a route. The screen
UI lives in `src/screens/` (kept out of `src/app/` so only routes sit there).

```
src/app/_layout.tsx             providers + auth gate (Stack.Protected)
src/app/sign-in.tsx             login route
src/app/index.tsx               members list (home)
src/app/member/new.tsx          add member
src/app/member/[id]/index.tsx   member detail + charts
src/app/member/[id]/edit.tsx    edit member
src/app/member/[id]/measure.tsx record a reading
src/lib/config.ts               <-- your Supabase URL + anon key
src/lib/supabase.ts             Supabase client
src/lib/calc.ts                 BMI / BMR / age / date helpers
src/lib/report.ts               builds the PDF progress report (HTML)
src/lib/types.ts                shared TypeScript types
src/context/AuthContext.tsx     login session + profile
src/screens/                    the screen components
src/components/ui.tsx           Button, Field, Card, StatTile
src/components/DateField.tsx    cross-platform date picker
supabase/schema.sql             run this once in Supabase
```

## Expo Go compatibility

This project targets **Expo SDK 57**. Install the Expo Go app from the store (its
latest release supports SDK 57) and scan the QR code from `npx expo start`. If you
ever see "project is incompatible with this version of Expo Go", the project's SDK
is newer than the installed Expo Go — that's what the SDK pin here prevents.
