
-- New table: payroll_adjustments
CREATE TABLE public.payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL DEFAULT 'earning',
  component_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  effective_period_start date,
  effective_period_end date,
  is_recurring boolean DEFAULT false,
  recurrence_end date,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid,
  applied_in_run_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage payroll_adjustments" ON public.payroll_adjustments FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own adjustments" ON public.payroll_adjustments FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- New table: payroll_exceptions
CREATE TABLE public.payroll_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid REFERENCES payroll_periods(id),
  employee_id uuid REFERENCES employees(id),
  exception_type text NOT NULL,
  severity text DEFAULT 'medium',
  description text NOT NULL,
  owner_id uuid,
  status text DEFAULT 'open',
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  sla_due_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage payroll_exceptions" ON public.payroll_exceptions FOR ALL USING (is_admin_or_hr(auth.uid()));

-- New table: payroll_disputes
CREATE TABLE public.payroll_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id uuid NOT NULL REFERENCES payroll_line_items(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  dispute_type text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open',
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage payroll_disputes" ON public.payroll_disputes FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can manage own disputes" ON public.payroll_disputes FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Alter payroll_runs: add governance fields
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS run_type text DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopened_by uuid,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz;

-- Alter payroll_line_items: add adjustment tracking
ALTER TABLE public.payroll_line_items
  ADD COLUMN IF NOT EXISTS adjustments_earning numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustments_deduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrears numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_period_net numeric,
  ADD COLUMN IF NOT EXISTS variance_pct numeric;
