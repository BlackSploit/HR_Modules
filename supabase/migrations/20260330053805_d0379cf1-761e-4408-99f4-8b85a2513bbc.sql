
-- 1. Programs table
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  program_director_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage programs" ON public.programs FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view programs" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Center config table
CREATE TABLE public.center_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  center_head_user_id UUID REFERENCES auth.users(id),
  clinical_lead_user_id UUID REFERENCES auth.users(id),
  total_beds INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);
ALTER TABLE public.center_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage center config" ON public.center_config FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view center config" ON public.center_config FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_center_config_updated_at BEFORE UPDATE ON public.center_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Reporting chains table
CREATE TABLE public.reporting_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reports_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_type TEXT NOT NULL DEFAULT 'direct',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reports_to_user_id, chain_type)
);
ALTER TABLE public.reporting_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage reporting chains" ON public.reporting_chains FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Users can view own chain" ON public.reporting_chains FOR SELECT USING (auth.uid() = user_id OR auth.uid() = reports_to_user_id);
CREATE TRIGGER update_reporting_chains_updated_at BEFORE UPDATE ON public.reporting_chains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Add program_id to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id);

-- 5. Seed programs
INSERT INTO public.programs (name, code, description) VALUES
  ('De-addiction', 'DEADD', 'Substance abuse and addiction recovery program'),
  ('Psychiatry', 'PSYCH', 'General psychiatry and mental health treatment'),
  ('Dual Diagnosis', 'DUAL', 'Co-occurring mental health and substance use disorders'),
  ('Dementia Care', 'DEMEN', 'Specialized dementia and cognitive disorder care'),
  ('Rehabilitation', 'REHAB', 'Physical and psychological rehabilitation services');

-- 6. Helper function
CREATE OR REPLACE FUNCTION public.is_center_head_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'hr_manager', 'center_head', 'clinical_lead')
  )
$$;
