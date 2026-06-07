
-- Create onboarding_competencies table for competency sign-off tracking
CREATE TABLE public.onboarding_competencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.onboarding_cases(id) ON DELETE CASCADE,
  competency_name TEXT NOT NULL,
  group_name TEXT,
  observed BOOLEAN NOT NULL DEFAULT false,
  observed_at TIMESTAMP WITH TIME ZONE,
  observed_by UUID,
  supervised BOOLEAN NOT NULL DEFAULT false,
  supervised_at TIMESTAMP WITH TIME ZONE,
  supervised_by UUID,
  independent BOOLEAN NOT NULL DEFAULT false,
  independent_at TIMESTAMP WITH TIME ZONE,
  independent_by UUID,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can manage onboarding_competencies"
  ON public.onboarding_competencies FOR ALL
  USING (is_admin_or_hr(auth.uid()));

CREATE POLICY "Center heads can view onboarding_competencies"
  ON public.onboarding_competencies FOR SELECT
  USING (is_center_head_or_above(auth.uid()));
