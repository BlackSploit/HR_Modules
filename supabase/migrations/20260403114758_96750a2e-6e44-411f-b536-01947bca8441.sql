
-- 1. Leave Accrual Rules
CREATE TABLE public.leave_accrual_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  accrual_method text NOT NULL DEFAULT 'fixed_annual',
  posting_frequency text NOT NULL DEFAULT 'yearly',
  carry_forward_cap numeric DEFAULT 0,
  encashment_allowed boolean DEFAULT false,
  max_encashment_days numeric DEFAULT 0,
  tenure_threshold_months integer DEFAULT 0,
  proration_rule text DEFAULT 'proportional',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_accrual_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_accrual_rules" ON public.leave_accrual_rules FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view leave_accrual_rules" ON public.leave_accrual_rules FOR SELECT TO authenticated USING (true);

-- 2. Leave Accrual Logs
CREATE TABLE public.leave_accrual_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  accrual_date date NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'accrual',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_accrual_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_accrual_logs" ON public.leave_accrual_logs FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own accrual_logs" ON public.leave_accrual_logs FOR SELECT TO public USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 3. Leave Policies
CREATE TABLE public.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  name text NOT NULL,
  employment_type text,
  department_id uuid REFERENCES public.departments(id),
  branch_id uuid REFERENCES public.branches(id),
  designation_id uuid REFERENCES public.designations(id),
  max_continuous_days integer,
  notice_days_required integer DEFAULT 0,
  blackout_dates jsonb DEFAULT '[]',
  min_tenure_months integer DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_policies" ON public.leave_policies FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view leave_policies" ON public.leave_policies FOR SELECT TO authenticated USING (true);

-- 4. Leave Approval Chains
CREATE TABLE public.leave_approval_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type_id uuid REFERENCES public.leave_types(id),
  min_days numeric DEFAULT 0,
  department_id uuid REFERENCES public.departments(id),
  is_active boolean DEFAULT true,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_approval_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_approval_chains" ON public.leave_approval_chains FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view leave_approval_chains" ON public.leave_approval_chains FOR SELECT TO authenticated USING (true);

-- 5. Leave Approval Steps
CREATE TABLE public.leave_approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid NOT NULL REFERENCES public.leave_approval_chains(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL DEFAULT 1,
  approver_role text,
  approver_user_id uuid,
  sla_hours integer DEFAULT 48,
  status text DEFAULT 'pending',
  leave_request_id uuid REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  acted_by uuid,
  acted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_approval_steps" ON public.leave_approval_steps FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Approvers can view assigned steps" ON public.leave_approval_steps FOR SELECT TO public USING (auth.uid() = approver_user_id);

-- 6. Leave of Absence Cases
CREATE TABLE public.leave_of_absence_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  case_type text NOT NULL,
  expected_return_date date,
  actual_return_date date,
  medical_certificate_url text,
  medical_certificate_status text DEFAULT 'pending',
  return_to_work_checklist jsonb DEFAULT '[]',
  fitness_clearance boolean DEFAULT false,
  contact_log jsonb DEFAULT '[]',
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_of_absence_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage loa_cases" ON public.leave_of_absence_cases FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own loa_cases" ON public.leave_of_absence_cases FOR SELECT TO public USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 7. Leave Coverage Rules
CREATE TABLE public.leave_coverage_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id),
  min_staff_count integer NOT NULL DEFAULT 1,
  role_designation_id uuid REFERENCES public.designations(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_coverage_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_coverage_rules" ON public.leave_coverage_rules FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view leave_coverage_rules" ON public.leave_coverage_rules FOR SELECT TO authenticated USING (true);

-- 8. Leave Overrides
CREATE TABLE public.leave_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id),
  override_type text NOT NULL,
  reason text NOT NULL,
  requested_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_overrides" ON public.leave_overrides FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own overrides" ON public.leave_overrides FOR SELECT TO public USING (requested_by = auth.uid());

-- 9. Leave Audit Log
CREATE TABLE public.leave_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage leave_audit_log" ON public.leave_audit_log FOR ALL TO public USING (public.is_admin_or_hr(auth.uid()));
