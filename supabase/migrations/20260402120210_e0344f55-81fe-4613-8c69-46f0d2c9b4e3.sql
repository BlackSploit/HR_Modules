CREATE TABLE public.roster_week_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date date NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  status text NOT NULL DEFAULT 'draft',
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(week_start_date, branch_id)
);

ALTER TABLE public.roster_week_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roster status"
  ON public.roster_week_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/HR can manage roster status"
  ON public.roster_week_status FOR ALL TO authenticated
  USING (is_admin_or_hr(auth.uid()))
  WITH CHECK (is_admin_or_hr(auth.uid()));