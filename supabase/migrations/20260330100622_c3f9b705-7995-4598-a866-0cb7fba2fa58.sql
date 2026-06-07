
-- Screening Templates
CREATE TABLE public.screening_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  job_family text NOT NULL DEFAULT 'general',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  approved_by uuid,
  effective_from date,
  branches text[] DEFAULT '{}'::text[],
  pass_threshold integer NOT NULL DEFAULT 80,
  hold_threshold integer NOT NULL DEFAULT 45,
  reject_threshold integer NOT NULL DEFAULT 44,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_templates" ON public.screening_templates FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view screening_templates" ON public.screening_templates FOR SELECT TO authenticated USING (true);

-- Screening Template Rules
CREATE TABLE public.screening_template_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.screening_templates(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'weighted',
  field_name text NOT NULL,
  operator text NOT NULL DEFAULT 'gte',
  threshold_value text,
  weight integer NOT NULL DEFAULT 10,
  fail_action text NOT NULL DEFAULT 'deduct_points',
  label text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_template_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_template_rules" ON public.screening_template_rules FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view screening_template_rules" ON public.screening_template_rules FOR SELECT TO authenticated USING (true);

-- Screening Template Questions
CREATE TABLE public.screening_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.screening_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  response_type text NOT NULL DEFAULT 'yes_no',
  is_mandatory boolean NOT NULL DEFAULT false,
  scoring_logic jsonb DEFAULT '{}'::jsonb,
  max_score integer NOT NULL DEFAULT 10,
  stage text NOT NULL DEFAULT 'recruiter_screen',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_template_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_template_questions" ON public.screening_template_questions FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view screening_template_questions" ON public.screening_template_questions FOR SELECT TO authenticated USING (true);

-- Screening Template Documents
CREATE TABLE public.screening_template_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.screening_templates(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  stage_required_at text NOT NULL DEFAULT 'screening',
  is_mandatory boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_template_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_template_documents" ON public.screening_template_documents FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view screening_template_documents" ON public.screening_template_documents FOR SELECT TO authenticated USING (true);

-- Screening Runs
CREATE TABLE public.screening_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requisition_id uuid REFERENCES public.job_requisitions(id) ON DELETE SET NULL,
  template_id uuid NOT NULL REFERENCES public.screening_templates(id),
  total_score numeric NOT NULL DEFAULT 0,
  result_band text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'running',
  knockout_failed boolean NOT NULL DEFAULT false,
  red_flags text[] DEFAULT '{}'::text[],
  run_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_runs" ON public.screening_runs FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view screening_runs" ON public.screening_runs FOR SELECT USING (is_center_head_or_above(auth.uid()));

-- Screening Result Items
CREATE TABLE public.screening_result_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.screening_runs(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.screening_template_rules(id) ON DELETE SET NULL,
  question_id uuid REFERENCES public.screening_template_questions(id) ON DELETE SET NULL,
  outcome text NOT NULL DEFAULT 'pending',
  points_awarded numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_result_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_result_items" ON public.screening_result_items FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view screening_result_items" ON public.screening_result_items FOR SELECT USING (is_center_head_or_above(auth.uid()));

-- Screening Exceptions
CREATE TABLE public.screening_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.screening_runs(id) ON DELETE CASCADE,
  failed_rule_id uuid REFERENCES public.screening_template_rules(id) ON DELETE SET NULL,
  reason text NOT NULL,
  requested_by uuid NOT NULL,
  approver_id uuid,
  decision text NOT NULL DEFAULT 'pending',
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage screening_exceptions" ON public.screening_exceptions FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Requesters can view own exceptions" ON public.screening_exceptions FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "Approvers can update assigned exceptions" ON public.screening_exceptions FOR UPDATE USING (auth.uid() = approver_id);

-- Add screening_template_id to job_requisitions
ALTER TABLE public.job_requisitions ADD COLUMN IF NOT EXISTS screening_template_id uuid REFERENCES public.screening_templates(id);
