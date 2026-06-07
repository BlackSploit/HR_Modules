
-- =============================================
-- PHASE 3A: KPI ENGINE
-- =============================================

-- KPI Definitions
CREATE TABLE public.kpi_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  target_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  frequency TEXT NOT NULL DEFAULT 'daily',
  formula_type TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage kpi_definitions" ON public.kpi_definitions FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view kpi_definitions" ON public.kpi_definitions FOR SELECT TO authenticated USING (true);

-- KPI Entries
CREATE TABLE public.kpi_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  center_id UUID REFERENCES public.branches(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage kpi_entries" ON public.kpi_entries FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view center kpi_entries" ON public.kpi_entries FOR SELECT USING (is_center_head_or_above(auth.uid()));
CREATE POLICY "Users can manage own kpi_entries" ON public.kpi_entries FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- PHASE 3B: ALERT & ESCALATION ENGINE
-- =============================================

-- Alert severity enum
CREATE TYPE public.alert_severity AS ENUM ('L1', 'L2', 'L3');
CREATE TYPE public.alert_status AS ENUM ('triggered', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'closed');
CREATE TYPE public.alert_category AS ENUM ('clinical', 'operations', 'business', 'financial');

-- Alert Types
CREATE TABLE public.alert_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  severity_level alert_severity NOT NULL DEFAULT 'L1',
  category alert_category NOT NULL DEFAULT 'operations',
  default_response_sla_minutes INTEGER NOT NULL DEFAULT 30,
  default_resolution_sla_minutes INTEGER NOT NULL DEFAULT 120,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage alert_types" ON public.alert_types FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view alert_types" ON public.alert_types FOR SELECT TO authenticated USING (true);

-- Alerts
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type_id UUID NOT NULL REFERENCES public.alert_types(id),
  center_id UUID REFERENCES public.branches(id),
  triggered_by UUID NOT NULL,
  patient_reference TEXT,
  severity alert_severity NOT NULL,
  status alert_status NOT NULL DEFAULT 'triggered',
  description TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  current_assignee_id UUID,
  resolution_notes TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR/Center heads can manage alerts" ON public.alerts FOR ALL USING (is_center_head_or_above(auth.uid()));
CREATE POLICY "Assigned users can update alerts" ON public.alerts FOR UPDATE USING (auth.uid() = current_assignee_id);
CREATE POLICY "Triggerers can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = triggered_by);
CREATE POLICY "Assignees can view assigned alerts" ON public.alerts FOR SELECT USING (auth.uid() = current_assignee_id);

-- Alert Escalation Rules
CREATE TABLE public.alert_escalation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type_id UUID NOT NULL REFERENCES public.alert_types(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  delay_minutes INTEGER NOT NULL DEFAULT 15,
  notify_role app_role,
  notify_user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_escalation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage escalation_rules" ON public.alert_escalation_rules FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view escalation_rules" ON public.alert_escalation_rules FOR SELECT TO authenticated USING (true);

-- Alert SOP Templates
CREATE TABLE public.alert_sop_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type_id UUID NOT NULL REFERENCES public.alert_types(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  expected_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_sop_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage sop_templates" ON public.alert_sop_templates FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view sop_templates" ON public.alert_sop_templates FOR SELECT TO authenticated USING (true);

-- Alert SOP Completions
CREATE TABLE public.alert_sop_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  sop_step_id UUID NOT NULL REFERENCES public.alert_sop_templates(id),
  completed_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  evidence_url TEXT
);
ALTER TABLE public.alert_sop_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center heads can manage sop_completions" ON public.alert_sop_completions FOR ALL USING (is_center_head_or_above(auth.uid()));
CREATE POLICY "Users can insert own sop_completions" ON public.alert_sop_completions FOR INSERT WITH CHECK (auth.uid() = completed_by);
CREATE POLICY "Users can view own sop_completions" ON public.alert_sop_completions FOR SELECT USING (auth.uid() = completed_by);

-- Enable realtime on alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- =============================================
-- PHASE 3C: AUDIT & COMPLIANCE
-- =============================================

CREATE TABLE public.audit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID REFERENCES public.branches(id),
  user_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sop_completion_score NUMERIC NOT NULL DEFAULT 0,
  timeliness_score NUMERIC NOT NULL DEFAULT 0,
  documentation_score NUMERIC NOT NULL DEFAULT 0,
  overall_compliance_score NUMERIC NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage audit_scores" ON public.audit_scores FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view center audit_scores" ON public.audit_scores FOR SELECT USING (is_center_head_or_above(auth.uid()));
CREATE POLICY "Users can view own audit_scores" ON public.audit_scores FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- PHASE 3D: CLINICAL DOCUMENTATION
-- =============================================

CREATE TABLE public.clinical_document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields_schema JSONB NOT NULL DEFAULT '[]',
  is_mandatory_for_alert_type_id UUID REFERENCES public.alert_types(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage clinical_doc_templates" ON public.clinical_document_templates FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Authenticated can view clinical_doc_templates" ON public.clinical_document_templates FOR SELECT TO authenticated USING (true);

CREATE TABLE public.clinical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.clinical_document_templates(id),
  alert_id UUID REFERENCES public.alerts(id),
  employee_id UUID NOT NULL,
  center_id UUID REFERENCES public.branches(id),
  patient_reference TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  signed_by UUID,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/HR can manage clinical_documents" ON public.clinical_documents FOR ALL USING (is_admin_or_hr(auth.uid()));
CREATE POLICY "Center heads can view center clinical_docs" ON public.clinical_documents FOR SELECT USING (is_center_head_or_above(auth.uid()));
CREATE POLICY "Users can manage own clinical_docs" ON public.clinical_documents FOR ALL USING (auth.uid() = employee_id);

-- updated_at triggers
CREATE TRIGGER update_kpi_definitions_updated_at BEFORE UPDATE ON public.kpi_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_entries_updated_at BEFORE UPDATE ON public.kpi_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_types_updated_at BEFORE UPDATE ON public.alert_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_scores_updated_at BEFORE UPDATE ON public.audit_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_doc_templates_updated_at BEFORE UPDATE ON public.clinical_document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_documents_updated_at BEFORE UPDATE ON public.clinical_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
