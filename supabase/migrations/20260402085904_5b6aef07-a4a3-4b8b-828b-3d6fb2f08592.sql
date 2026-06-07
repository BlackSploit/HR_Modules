
-- 1. Create onboarding_stage enum
CREATE TYPE public.onboarding_stage AS ENUM (
  'offer_accepted',
  'preboarding',
  'joining_review',
  'day1_orientation',
  'dept_induction',
  'role_induction',
  'supervised_practice',
  'competency_signoff',
  'deployment_clearance',
  'integration_30_60_90',
  'completed'
);

-- 2. Add 'onboarding' to employee_status enum
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'onboarding' BEFORE 'probation';

-- 3. Create onboarding_cases table
CREATE TABLE public.onboarding_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  requisition_id UUID REFERENCES public.job_requisitions(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  designation_id UUID REFERENCES public.designations(id) ON DELETE SET NULL,
  role_family TEXT,
  joining_date DATE,
  onboarding_owner_id UUID,
  current_stage public.onboarding_stage NOT NULL DEFAULT 'offer_accepted',
  readiness_score INTEGER NOT NULL DEFAULT 0,
  clearance_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_cases" ON public.onboarding_cases
  FOR ALL USING (public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Center heads can view onboarding_cases" ON public.onboarding_cases
  FOR SELECT USING (public.is_center_head_or_above(auth.uid()));

CREATE POLICY "Users can view own onboarding_case" ON public.onboarding_cases
  FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE TRIGGER update_onboarding_cases_updated_at
  BEFORE UPDATE ON public.onboarding_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create onboarding_templates table
CREATE TABLE public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_family TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stage_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_templates" ON public.onboarding_templates
  FOR ALL USING (public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Authenticated can view onboarding_templates" ON public.onboarding_templates
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create onboarding_tasks table
CREATE TABLE public.onboarding_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.onboarding_cases(id) ON DELETE CASCADE,
  template_block_ref TEXT,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'checklist',
  stage public.onboarding_stage NOT NULL DEFAULT 'preboarding',
  owner_role TEXT,
  owner_user_id UUID,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  evidence_url TEXT,
  notes TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_tasks" ON public.onboarding_tasks
  FOR ALL USING (public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Center heads can view onboarding_tasks" ON public.onboarding_tasks
  FOR SELECT USING (public.is_center_head_or_above(auth.uid()));

CREATE POLICY "Task owners can update own tasks" ON public.onboarding_tasks
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Task owners can view own tasks" ON public.onboarding_tasks
  FOR SELECT USING (auth.uid() = owner_user_id);

-- 6. Create onboarding_stage_history table
CREATE TABLE public.onboarding_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.onboarding_cases(id) ON DELETE CASCADE,
  from_stage public.onboarding_stage,
  to_stage public.onboarding_stage NOT NULL,
  moved_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_stage_history" ON public.onboarding_stage_history
  FOR ALL USING (public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Center heads can view stage_history" ON public.onboarding_stage_history
  FOR SELECT USING (public.is_center_head_or_above(auth.uid()));

-- 7. Create onboarding_documents table
CREATE TABLE public.onboarding_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.onboarding_cases(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  file_url TEXT,
  upload_by TEXT NOT NULL DEFAULT 'hr',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  expiry_date DATE,
  reviewer_id UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_documents" ON public.onboarding_documents
  FOR ALL USING (public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Center heads can view onboarding_documents" ON public.onboarding_documents
  FOR SELECT USING (public.is_center_head_or_above(auth.uid()));

-- 8. Enable realtime on onboarding_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_tasks;
