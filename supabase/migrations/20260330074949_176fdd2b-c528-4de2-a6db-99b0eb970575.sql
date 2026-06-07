
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS profession_category text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

CREATE POLICY "Auth users can upload resumes" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Admin HR can read resumes" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Center heads can read resumes" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND public.is_center_head_or_above(auth.uid()));
