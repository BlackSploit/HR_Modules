
-- Employee Salary Structures
CREATE TABLE public.employee_salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  basic_pay numeric NOT NULL DEFAULT 0,
  hra numeric DEFAULT 0,
  da numeric DEFAULT 0,
  special_allowance numeric DEFAULT 0,
  pf_employee numeric DEFAULT 0,
  pf_employer numeric DEFAULT 0,
  esi_employee numeric DEFAULT 0,
  esi_employer numeric DEFAULT 0,
  professional_tax numeric DEFAULT 0,
  tds numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  gross_salary numeric GENERATED ALWAYS AS (basic_pay + COALESCE(hra,0) + COALESCE(da,0) + COALESCE(special_allowance,0)) STORED,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.employee_salary_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage salary_structures" ON public.employee_salary_structures FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own salary_structure" ON public.employee_salary_structures FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Payroll Runs
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  total_gross numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  total_net numeric DEFAULT 0,
  employee_count integer DEFAULT 0,
  run_by uuid,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage payroll_runs" ON public.payroll_runs FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view payroll_runs" ON public.payroll_runs FOR SELECT TO authenticated USING (true);

-- Payroll Line Items
CREATE TABLE public.payroll_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  working_days integer DEFAULT 0,
  days_present integer DEFAULT 0,
  days_absent integer DEFAULT 0,
  days_leave_paid integer DEFAULT 0,
  days_leave_unpaid integer DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  basic_pay numeric DEFAULT 0,
  hra numeric DEFAULT 0,
  da numeric DEFAULT 0,
  special_allowance numeric DEFAULT 0,
  overtime_pay numeric DEFAULT 0,
  gross_pay numeric DEFAULT 0,
  pf_employee numeric DEFAULT 0,
  pf_employer numeric DEFAULT 0,
  esi_employee numeric DEFAULT 0,
  esi_employer numeric DEFAULT 0,
  professional_tax numeric DEFAULT 0,
  tds numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  net_pay numeric DEFAULT 0,
  lop_days integer DEFAULT 0,
  lop_deduction numeric DEFAULT 0,
  status text DEFAULT 'calculated',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage payroll_line_items" ON public.payroll_line_items FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own payroll_line_items" ON public.payroll_line_items FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
