-- Synthetic dev seed — NEVER contains real PHI.
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING).
--
-- Prerequisites:
--   1. Create the demo Supabase Auth user first (handle_new_user trigger
--      auto-creates the matching app_user + family row):
--        supabase auth admin create --email demo@sehatvault.dev
--      Or via Dashboard → Auth → Users → Invite user.
--   2. Apply this file:
--        psql $DATABASE_URL < supabase/seed/seed.sql
--      or:
--        supabase db execute --file supabase/seed/seed.sql
--
-- Fixed UUIDs guarantee idempotency across re-runs.

DO $$
DECLARE
  _user_id   uuid;
  _family_id uuid;

  -- Fixed member UUIDs
  _m1 uuid := '33333333-3333-3333-3333-333333333301'; -- Ramesh (father, DM+HTN)
  _m2 uuid := '33333333-3333-3333-3333-333333333302'; -- Aarav (son, vaccines)
  _m3 uuid := '33333333-3333-3333-3333-333333333303'; -- Priya (self, thyroid)

  -- Fixed record UUIDs
  _r1 uuid := '10000000-1000-1000-1000-100000000001'; -- Ramesh: HbA1c lab
  _r2 uuid := '10000000-1000-1000-1000-100000000002'; -- Ramesh: prescription
  _r3 uuid := '10000000-1000-1000-1000-100000000003'; -- Ramesh: chest X-ray
  _r4 uuid := '10000000-1000-1000-1000-100000000004'; -- Aarav: MMR vaccine
  _r5 uuid := '10000000-1000-1000-1000-100000000005'; -- Priya: TSH panel
  _r6 uuid := '10000000-1000-1000-1000-100000000006'; -- Priya: Eltroxin Rx
BEGIN
  -- Locate demo user created via Supabase Auth
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = 'demo@sehatvault.dev'
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE NOTICE
      'Demo user not found. Create it first: supabase auth admin create --email demo@sehatvault.dev';
    RETURN;
  END IF;

  -- The handle_new_user trigger creates one family per user; find it
  SELECT id INTO _family_id
  FROM public.family
  WHERE owner_user_id = _user_id
  LIMIT 1;

  IF _family_id IS NULL THEN
    RAISE EXCEPTION
      'Family row missing for demo user — handle_new_user trigger may not have fired.';
  END IF;

  -- Give the demo family a friendly name (only if still at the default)
  UPDATE public.family
  SET name = 'Sharma Family'
  WHERE id = _family_id AND name = 'My Family';

  -- ── 3 Members ──────────────────────────────────────────────────────────────
  INSERT INTO public.member_profile
    (id, family_id, display_name, relationship, dob, sex, blood_group,
     chronic_conditions)
  VALUES
    (_m1, _family_id, 'Ramesh Sharma', 'father',
     '1955-03-15', 'male', 'B+',
     ARRAY['Type 2 Diabetes', 'Hypertension']),
    (_m2, _family_id, 'Aarav Sharma', 'son',
     '2015-07-22', 'male', 'O+',
     '{}'),
    (_m3, _family_id, 'Priya Sharma', 'self',
     '1990-11-08', 'female', 'A+',
     ARRAY['Hypothyroidism'])
  ON CONFLICT (id) DO NOTHING;

  -- ── 6 Health records — SYNTHETIC data only ─────────────────────────────────
  INSERT INTO public.health_record
    (id, family_id, member_id, type, source, title,
     ocr_status, record_date, doctor, facility, summary, created_by)
  VALUES
    -- [Ramesh] Lab report: slightly elevated HbA1c
    (_r1, _family_id, _m1,
     'lab_report', 'upload', 'HbA1c & Blood Sugar Panel',
     'manual', '2026-06-10',
     'Dr. Suresh Patel', 'Thyrocare Labs, Pune',
     'HbA1c 7.8 % (borderline high). FBS 142 mg/dL. Review in 3 months.',
     _user_id),

    -- [Ramesh] Prescription: anti-diabetic + antihypertensive
    (_r2, _family_id, _m1,
     'prescription', 'upload', 'Metformin & Atenolol Prescription',
     'manual', '2026-06-10',
     'Dr. Suresh Patel', 'Apollo Clinic, Pune',
     'Metformin 500 mg twice daily. Atenolol 25 mg once daily.',
     _user_id),

    -- [Ramesh] Scan: chest X-ray from Jan
    (_r3, _family_id, _m1,
     'scan', 'upload', 'Chest X-Ray',
     'manual', '2026-01-20',
     'Dr. Ananya Rao', 'City Scan Centre',
     'No active lung lesions. Mild cardiomegaly noted.',
     _user_id),

    -- [Aarav] Vaccination: MMR 2nd dose
    (_r4, _family_id, _m2,
     'vaccination', 'manual', 'MMR Vaccine — 2nd Dose',
     'manual', '2025-09-05',
     'Dr. Kavita Nair', 'Rainbow Children''s Clinic',
     'MMR 2nd dose administered. Next due: Tdap at age 11.',
     _user_id),

    -- [Priya] Lab report: thyroid panel
    (_r5, _family_id, _m3,
     'lab_report', 'upload', 'TSH & T3/T4 Panel',
     'manual', '2026-05-18',
     'Dr. Meera Shah', 'Metropolis Labs',
     'TSH 4.2 mIU/L (borderline high). T4 normal. Continue current dose.',
     _user_id),

    -- [Priya] Prescription: Eltroxin for hypothyroidism
    (_r6, _family_id, _m3,
     'prescription', 'manual', 'Eltroxin Prescription',
     'manual', '2026-05-18',
     'Dr. Meera Shah', 'Max Healthcare',
     'Eltroxin 50 mcg once daily on empty stomach.',
     _user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE
    'Seed complete: 3 members + 6 records inserted for demo@sehatvault.dev (family: %).',
    _family_id;
END
$$;
