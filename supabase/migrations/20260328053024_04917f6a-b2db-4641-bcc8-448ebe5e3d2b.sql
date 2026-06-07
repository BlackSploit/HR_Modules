
-- Shift Templates
CREATE TABLE public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shift templates" ON public.shift_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/HR can manage shift templates" ON public.shift_templates FOR ALL USING (is_admin_or_hr(auth.uid()));

-- Roster Assignments (who works which shift on which day)
CREATE TABLE public.roster_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_template_id UUID NOT NULL REFERENCES public.shift_templates(id),
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'swapped', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.roster_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage roster" ON public.roster_assignments FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Dept heads can manage dept roster" ON public.roster_assignments FOR ALL USING (
  has_role(auth.uid(), 'department_head') AND employee_id IN (
    SELECT e.id FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE d.head_user_id = auth.uid()
  )
);
CREATE POLICY "Staff can view own roster" ON public.roster_assignments FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Attendance Records
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'half_day', 'on_leave', 'holiday')),
  worked_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  geo_lat NUMERIC(10,7),
  geo_lng NUMERIC(10,7),
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage attendance" ON public.attendance_records FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Dept heads can view dept attendance" ON public.attendance_records FOR SELECT USING (
  has_role(auth.uid(), 'department_head') AND employee_id IN (
    SELECT e.id FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE d.head_user_id = auth.uid()
  )
);
CREATE POLICY "Staff can manage own attendance" ON public.attendance_records FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Leave Types
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  max_days_per_year INTEGER NOT NULL DEFAULT 12,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_document BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view leave types" ON public.leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/HR can manage leave types" ON public.leave_types FOR ALL USING (is_admin_or_hr(auth.uid()));

-- Leave Balances
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  used_days NUMERIC(4,1) NOT NULL DEFAULT 0,
  carried_forward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage leave balances" ON public.leave_balances FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Staff can view own leave balances" ON public.leave_balances FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Leave Requests
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(4,1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage leave requests" ON public.leave_requests FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Dept heads can manage dept leave requests" ON public.leave_requests FOR ALL USING (
  has_role(auth.uid(), 'department_head') AND employee_id IN (
    SELECT e.id FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE d.head_user_id = auth.uid()
  )
);
CREATE POLICY "Staff can manage own leave requests" ON public.leave_requests FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'leave', 'roster', 'attendance')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin/HR can insert notifications" ON public.notifications FOR INSERT WITH CHECK (is_admin_or_hr(auth.uid()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Triggers for updated_at
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON public.shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roster_assignments_updated_at BEFORE UPDATE ON public.roster_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
