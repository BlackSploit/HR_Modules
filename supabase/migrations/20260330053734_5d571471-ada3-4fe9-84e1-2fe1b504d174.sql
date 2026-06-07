
-- Step 1: Only expand the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'center_head';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinical_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'program_director';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ward_incharge';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'duty_medical_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'psychologist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'psw';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admission_counsellor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nursing_head';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rehab_coordinator';
