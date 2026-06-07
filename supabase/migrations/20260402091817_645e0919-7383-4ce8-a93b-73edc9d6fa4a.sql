
-- Add buddy_id column to onboarding_cases
ALTER TABLE public.onboarding_cases ADD COLUMN buddy_id uuid REFERENCES public.employees(id);

-- Create onboarding-documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-documents', 'onboarding-documents', false);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload onboarding docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'onboarding-documents');

-- Storage RLS: authenticated users can view
CREATE POLICY "Authenticated users can view onboarding docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'onboarding-documents');

-- Storage RLS: authenticated users can update
CREATE POLICY "Authenticated users can update onboarding docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'onboarding-documents');
