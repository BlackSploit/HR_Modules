
ALTER TABLE public.leave_requests ADD COLUMN half_day text;

INSERT INTO storage.buckets (id, name, public) VALUES ('leave-documents', 'leave-documents', false);

CREATE POLICY "Admin/HR can manage leave documents" ON storage.objects FOR ALL USING (bucket_id = 'leave-documents' AND is_admin_or_hr(auth.uid()));

CREATE POLICY "Staff can upload own leave documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'leave-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can view own leave documents" ON storage.objects FOR SELECT USING (bucket_id = 'leave-documents' AND auth.role() = 'authenticated');
