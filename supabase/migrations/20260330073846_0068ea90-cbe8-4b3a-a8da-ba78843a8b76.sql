
-- =============================================
-- RECRUITMENT MODULE: ALL 11 TABLES
-- =============================================

-- 1. Job Requisitions
CREATE TABLE public.job_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  designation_id uuid REFERENCES public.designations(id),
  branch_id uuid REFERENCES public.branches(id),
  program_id uuid REFERENCES public.programs(id),
  category text NOT NULL DEFAULT 'employee',
  employment_type text NOT NULL DEFAULT 'full_time',
  headcount integer NOT NULL DEFAULT 1,
  budget_min numeric,
  budget_max numeric,
  urgency text NOT NULL DEFAULT 'normal',
  shift_pattern text,
  justification text,
  required_credentials text[] DEFAULT '{}',
  preferred_experience_years integer,
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage requisitions" ON public.job_requisitions FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Requesters can view own requisitions" ON public.job_requisitions FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "Dept heads can view dept requisitions" ON public.job_requisitions FOR SELECT USING (
  has_role(auth.uid(), 'department_head') AND department_id IN (
    SELECT id FROM departments WHERE head_user_id = auth.uid()
  )
);

CREATE TRIGGER update_job_requisitions_updated_at BEFORE UPDATE ON public.job_requisitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Requisition Approvals
CREATE TABLE public.requisition_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL REFERENCES public.job_requisitions(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  sequence_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  comments text,
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requisition_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage req_approvals" ON public.requisition_approvals FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Approvers can view own approvals" ON public.requisition_approvals FOR SELECT USING (auth.uid() = approver_id);
CREATE POLICY "Approvers can update own approvals" ON public.requisition_approvals FOR UPDATE USING (auth.uid() = approver_id);

-- 3. Candidates
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  current_city text,
  gender text,
  date_of_birth date,
  total_experience_years numeric,
  current_employer text,
  current_designation text,
  notice_period_days integer,
  expected_ctc numeric,
  source text NOT NULL DEFAULT 'direct',
  source_details text,
  resume_url text,
  resume_parsed_data jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  talent_pool_tags text[] DEFAULT '{}',
  registration_number text,
  registration_type text,
  registration_verified boolean DEFAULT false,
  duplicate_of uuid REFERENCES public.candidates(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage candidates" ON public.candidates FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view candidates" ON public.candidates FOR SELECT USING (is_center_head_or_above(auth.uid()));

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Candidate Stage History
CREATE TABLE public.candidate_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requisition_id uuid REFERENCES public.job_requisitions(id),
  from_stage text,
  to_stage text NOT NULL,
  moved_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage stage_history" ON public.candidate_stage_history FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view stage_history" ON public.candidate_stage_history FOR SELECT USING (is_center_head_or_above(auth.uid()));

-- 5. Candidate Requisition Links
CREATE TABLE public.candidate_requisition_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requisition_id uuid NOT NULL REFERENCES public.job_requisitions(id) ON DELETE CASCADE,
  current_stage text NOT NULL DEFAULT 'new',
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid,
  UNIQUE(candidate_id, requisition_id)
);

ALTER TABLE public.candidate_requisition_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage cand_req_links" ON public.candidate_requisition_links FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view cand_req_links" ON public.candidate_requisition_links FOR SELECT USING (is_center_head_or_above(auth.uid()));

-- 6. Screening Forms
CREATE TABLE public.screening_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requisition_id uuid REFERENCES public.job_requisitions(id),
  screened_by uuid,
  knockout_passed boolean DEFAULT true,
  answers jsonb DEFAULT '[]',
  compensation_fit text,
  location_fit text,
  notice_fit text,
  risk_notes text,
  overall_result text NOT NULL DEFAULT 'pass',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage screening_forms" ON public.screening_forms FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Screeners can manage own screenings" ON public.screening_forms FOR ALL USING (auth.uid() = screened_by);

-- 7. Interview Rounds
CREATE TABLE public.interview_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requisition_id uuid REFERENCES public.job_requisitions(id),
  round_name text NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  interviewer_id uuid,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  scorecard jsonb DEFAULT '[]',
  overall_score numeric,
  recommendation text,
  red_flags text,
  feedback_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage interview_rounds" ON public.interview_rounds FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Interviewers can manage own rounds" ON public.interview_rounds FOR ALL USING (auth.uid() = interviewer_id);

-- 8. Candidate Verifications
CREATE TABLE public.candidate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  verification_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  verified_by uuid,
  verified_at timestamptz,
  document_url text,
  notes text,
  waiver_approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage verifications" ON public.candidate_verifications FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view verifications" ON public.candidate_verifications FOR SELECT USING (is_center_head_or_above(auth.uid()));

CREATE TRIGGER update_candidate_verifications_updated_at BEFORE UPDATE ON public.candidate_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Offers
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requisition_id uuid REFERENCES public.job_requisitions(id),
  version integer NOT NULL DEFAULT 1,
  compensation_details jsonb DEFAULT '{}',
  designation_id uuid REFERENCES public.designations(id),
  department_id uuid REFERENCES public.departments(id),
  branch_id uuid REFERENCES public.branches(id),
  joining_date date,
  offer_expiry_date date,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid,
  sent_at timestamptz,
  accepted_at timestamptz,
  decline_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage offers" ON public.offers FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view offers" ON public.offers FOR SELECT USING (is_center_head_or_above(auth.uid()));

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Preboarding Tasks
CREATE TABLE public.preboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  category text NOT NULL DEFAULT 'document',
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.preboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage preboarding" ON public.preboarding_tasks FOR ALL USING (is_admin_or_hr(auth.uid()));

-- 11. Onboarding Plans
CREATE TABLE public.onboarding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id),
  candidate_id uuid REFERENCES public.candidates(id),
  plan_type text NOT NULL DEFAULT 'enterprise',
  status text NOT NULL DEFAULT 'not_started',
  items jsonb DEFAULT '[]',
  buddy_employee_id uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_plans" ON public.onboarding_plans FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Users can view own onboarding" ON public.onboarding_plans FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

CREATE TRIGGER update_onboarding_plans_updated_at BEFORE UPDATE ON public.onboarding_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Probation Reviews
CREATE TABLE public.probation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  review_type text NOT NULL DEFAULT 'day_30',
  reviewer_id uuid,
  attendance_score numeric,
  competency_score numeric,
  behavior_score numeric,
  overall_assessment text,
  outcome text NOT NULL DEFAULT 'on_track',
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.probation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage probation_reviews" ON public.probation_reviews FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Reviewers can manage own reviews" ON public.probation_reviews FOR ALL USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can view own probation" ON public.probation_reviews FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
