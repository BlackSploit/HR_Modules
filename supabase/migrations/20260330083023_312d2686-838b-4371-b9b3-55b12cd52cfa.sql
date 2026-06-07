ALTER TABLE public.job_requisitions
  ADD COLUMN IF NOT EXISTS job_description text,
  ADD COLUMN IF NOT EXISTS key_responsibilities text,
  ADD COLUMN IF NOT EXISTS required_qualifications text,
  ADD COLUMN IF NOT EXISTS preferred_skills text,
  ADD COLUMN IF NOT EXISTS location_details text,
  ADD COLUMN IF NOT EXISTS benefits text;