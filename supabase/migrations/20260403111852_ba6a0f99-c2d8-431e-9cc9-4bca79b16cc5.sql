
-- 1. Attendance exceptions table
CREATE TABLE public.attendance_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  exception_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  owner_id uuid,
  sla_due_at timestamptz,
  notes text,
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage attendance_exceptions" ON public.attendance_exceptions FOR ALL USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view attendance_exceptions" ON public.attendance_exceptions FOR SELECT USING (public.is_center_head_or_above(auth.uid()));

-- 2. Absence reasons lookup
CREATE TABLE public.absence_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  requires_document boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.absence_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage absence_reasons" ON public.absence_reasons FOR ALL USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view absence_reasons" ON public.absence_reasons FOR SELECT TO authenticated USING (true);

-- Add absence_reason_id to attendance_records
ALTER TABLE public.attendance_records ADD COLUMN absence_reason_id uuid REFERENCES public.absence_reasons(id);

-- 3. Regularization requests
CREATE TABLE public.regularization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_record_id uuid REFERENCES public.attendance_records(id),
  date date NOT NULL,
  requested_clock_in timestamptz,
  requested_clock_out timestamptz,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.regularization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage regularization_requests" ON public.regularization_requests FOR ALL USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can manage own regularization_requests" ON public.regularization_requests FOR ALL USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 4. Payroll periods
CREATE TABLE public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  locked_by uuid,
  locked_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage payroll_periods" ON public.payroll_periods FOR ALL USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view payroll_periods" ON public.payroll_periods FOR SELECT TO authenticated USING (true);

-- Seed default absence reasons
INSERT INTO public.absence_reasons (name, category, requires_document) VALUES
  ('Sick Leave', 'sick', true),
  ('Casual Leave', 'personal', false),
  ('Earned Leave', 'personal', false),
  ('Training Leave', 'training', false),
  ('Unauthorized Absence', 'unauthorized', false),
  ('Suspension', 'suspension', false),
  ('Family Emergency', 'family', false),
  ('Compensatory Off', 'other', false),
  ('Half Day - Medical', 'sick', false),
  ('Maternity/Paternity', 'family', true);
