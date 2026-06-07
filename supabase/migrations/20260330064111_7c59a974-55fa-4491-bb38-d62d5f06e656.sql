
-- Phase 4A: Review System
CREATE TABLE public.review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'mdt_weekly',
  center_id UUID REFERENCES public.branches(id),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.review_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.review_sessions(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.review_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.review_sessions(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 4B: Training Academy
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'clinical',
  duration_hours INTEGER NOT NULL DEFAULT 1,
  certification_level TEXT NOT NULL DEFAULT 'L1',
  target_roles TEXT[] DEFAULT '{}',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score NUMERIC,
  status TEXT NOT NULL DEFAULT 'enrolled',
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  certification_name TEXT NOT NULL,
  certification_level TEXT NOT NULL DEFAULT 'L1',
  certified_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  issued_by TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for review_sessions
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage review_sessions" ON public.review_sessions FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view center reviews" ON public.review_sessions FOR SELECT USING (is_center_head_or_above(auth.uid()));
CREATE POLICY "Creators can view own reviews" ON public.review_sessions FOR SELECT USING (auth.uid() = created_by);

-- RLS for review_agenda_items
ALTER TABLE public.review_agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage agenda_items" ON public.review_agenda_items FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view agenda_items" ON public.review_agenda_items FOR SELECT TO authenticated USING (true);

-- RLS for review_action_items
ALTER TABLE public.review_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage action_items" ON public.review_action_items FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Owners can view own action_items" ON public.review_action_items FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "Owners can update own action_items" ON public.review_action_items FOR UPDATE USING (auth.uid() = owner_user_id);

-- RLS for training_courses
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage training_courses" ON public.training_courses FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view training_courses" ON public.training_courses FOR SELECT TO authenticated USING (true);

-- RLS for training_enrollments
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage enrollments" ON public.training_enrollments FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Users can view own enrollments" ON public.training_enrollments FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- RLS for staff_certifications
ALTER TABLE public.staff_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage certifications" ON public.staff_certifications FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Users can view own certifications" ON public.staff_certifications FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);
CREATE POLICY "Center heads can view certifications" ON public.staff_certifications FOR SELECT USING (is_center_head_or_above(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_review_sessions_updated_at BEFORE UPDATE ON public.review_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_action_items_updated_at BEFORE UPDATE ON public.review_action_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_courses_updated_at BEFORE UPDATE ON public.training_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_enrollments_updated_at BEFORE UPDATE ON public.training_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_certifications_updated_at BEFORE UPDATE ON public.staff_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
