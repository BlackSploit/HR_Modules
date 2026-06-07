
-- New table: sourcing_plans
CREATE TABLE public.sourcing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid REFERENCES public.job_requisitions(id) ON DELETE CASCADE NOT NULL,
  recruiter_id uuid NOT NULL,
  hiring_manager_id uuid,
  target_count integer DEFAULT 1,
  target_join_date date,
  sla_days integer DEFAULT 30,
  channels text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sourcing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage sourcing_plans" ON public.sourcing_plans FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Recruiters can view own sourcing_plans" ON public.sourcing_plans FOR SELECT USING (auth.uid() = recruiter_id);
CREATE POLICY "Authenticated can view sourcing_plans" ON public.sourcing_plans FOR SELECT TO authenticated USING (true);

-- New table: candidate_outreach_logs
CREATE TABLE public.candidate_outreach_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  requisition_id uuid REFERENCES public.job_requisitions(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'call',
  contacted_by uuid NOT NULL,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  response_status text NOT NULL DEFAULT 'no_answer',
  notes text,
  next_followup_date date,
  interest_level integer,
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_outreach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage outreach_logs" ON public.candidate_outreach_logs FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Own outreach logs" ON public.candidate_outreach_logs FOR ALL USING (auth.uid() = contacted_by);

-- New table: talent_pools
CREATE TABLE public.talent_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pool_type text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage talent_pools" ON public.talent_pools FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view talent_pools" ON public.talent_pools FOR SELECT TO authenticated USING (true);

-- New table: talent_pool_members
CREATE TABLE public.talent_pool_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_pool_id uuid REFERENCES public.talent_pools(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  added_by uuid,
  re_engagement_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(talent_pool_id, candidate_id)
);

ALTER TABLE public.talent_pool_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage talent_pool_members" ON public.talent_pool_members FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view talent_pool_members" ON public.talent_pool_members FOR SELECT TO authenticated USING (true);

-- Alter candidates: add extended profile fields
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS preferred_location text,
  ADD COLUMN IF NOT EXISTS past_employers text,
  ADD COLUMN IF NOT EXISTS psychiatry_experience_years integer,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS year_of_completion text,
  ADD COLUMN IF NOT EXISTS license_credential_type text,
  ADD COLUMN IF NOT EXISTS languages_known text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS shift_readiness text,
  ADD COLUMN IF NOT EXISTS accommodation_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_salary numeric,
  ADD COLUMN IF NOT EXISTS joining_availability text,
  ADD COLUMN IF NOT EXISTS skill_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS rci_registration text,
  ADD COLUMN IF NOT EXISTS nursing_council_reg text,
  ADD COLUMN IF NOT EXISTS pharmacy_council_reg text,
  ADD COLUMN IF NOT EXISTS lab_certification text,
  ADD COLUMN IF NOT EXISTS clinical_exposure text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sourcing_stage text DEFAULT 'identified',
  ADD COLUMN IF NOT EXISTS recruiter_owner_id uuid,
  ADD COLUMN IF NOT EXISTS consent_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_followup_date date;

-- Alter job_requisitions: add sourcing fields
ALTER TABLE public.job_requisitions
  ADD COLUMN IF NOT EXISTS target_join_date date,
  ADD COLUMN IF NOT EXISTS recruiter_id uuid,
  ADD COLUMN IF NOT EXISTS hiring_manager_id uuid,
  ADD COLUMN IF NOT EXISTS gender_preference text;
