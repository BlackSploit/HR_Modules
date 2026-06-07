export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      absence_reasons: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_document: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_document?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_document?: boolean | null
        }
        Relationships: []
      }
      alert_escalation_rules: {
        Row: {
          alert_type_id: string
          created_at: string
          delay_minutes: number
          escalation_level: number
          id: string
          is_active: boolean
          notify_role: Database["public"]["Enums"]["app_role"] | null
          notify_user_id: string | null
        }
        Insert: {
          alert_type_id: string
          created_at?: string
          delay_minutes?: number
          escalation_level?: number
          id?: string
          is_active?: boolean
          notify_role?: Database["public"]["Enums"]["app_role"] | null
          notify_user_id?: string | null
        }
        Update: {
          alert_type_id?: string
          created_at?: string
          delay_minutes?: number
          escalation_level?: number
          id?: string
          is_active?: boolean
          notify_role?: Database["public"]["Enums"]["app_role"] | null
          notify_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_escalation_rules_alert_type_id_fkey"
            columns: ["alert_type_id"]
            isOneToOne: false
            referencedRelation: "alert_types"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_sop_completions: {
        Row: {
          alert_id: string
          completed_at: string
          completed_by: string
          evidence_url: string | null
          id: string
          notes: string | null
          sop_step_id: string
        }
        Insert: {
          alert_id: string
          completed_at?: string
          completed_by: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          sop_step_id: string
        }
        Update: {
          alert_id?: string
          completed_at?: string
          completed_by?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          sop_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_sop_completions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_sop_completions_sop_step_id_fkey"
            columns: ["sop_step_id"]
            isOneToOne: false
            referencedRelation: "alert_sop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_sop_templates: {
        Row: {
          alert_type_id: string
          created_at: string
          expected_duration_minutes: number | null
          id: string
          instruction: string
          is_mandatory: boolean
          step_number: number
        }
        Insert: {
          alert_type_id: string
          created_at?: string
          expected_duration_minutes?: number | null
          id?: string
          instruction: string
          is_mandatory?: boolean
          step_number: number
        }
        Update: {
          alert_type_id?: string
          created_at?: string
          expected_duration_minutes?: number | null
          id?: string
          instruction?: string
          is_mandatory?: boolean
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_sop_templates_alert_type_id_fkey"
            columns: ["alert_type_id"]
            isOneToOne: false
            referencedRelation: "alert_types"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_types: {
        Row: {
          category: Database["public"]["Enums"]["alert_category"]
          code: string
          created_at: string
          default_resolution_sla_minutes: number
          default_response_sla_minutes: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          severity_level: Database["public"]["Enums"]["alert_severity"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["alert_category"]
          code: string
          created_at?: string
          default_resolution_sla_minutes?: number
          default_response_sla_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          severity_level?: Database["public"]["Enums"]["alert_severity"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["alert_category"]
          code?: string
          created_at?: string
          default_resolution_sla_minutes?: number
          default_response_sla_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          severity_level?: Database["public"]["Enums"]["alert_severity"]
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type_id: string
          center_id: string | null
          created_at: string
          current_assignee_id: string | null
          description: string | null
          escalation_level: number
          id: string
          patient_reference: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          triggered_at: string
          triggered_by: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type_id: string
          center_id?: string | null
          created_at?: string
          current_assignee_id?: string | null
          description?: string | null
          escalation_level?: number
          id?: string
          patient_reference?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          triggered_at?: string
          triggered_by: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type_id?: string
          center_id?: string | null
          created_at?: string
          current_assignee_id?: string | null
          description?: string | null
          escalation_level?: number
          id?: string
          patient_reference?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          triggered_at?: string
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_alert_type_id_fkey"
            columns: ["alert_type_id"]
            isOneToOne: false
            referencedRelation: "alert_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_exceptions: {
        Row: {
          attendance_record_id: string | null
          created_at: string | null
          employee_id: string
          exception_type: string
          id: string
          notes: string | null
          owner_id: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          sla_due_at: string | null
          status: string
        }
        Insert: {
          attendance_record_id?: string | null
          created_at?: string | null
          employee_id: string
          exception_type: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sla_due_at?: string | null
          status?: string
        }
        Update: {
          attendance_record_id?: string | null
          created_at?: string | null
          employee_id?: string
          exception_type?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sla_due_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_exceptions_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          absence_reason_id: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          geo_lat: number | null
          geo_lng: number | null
          id: string
          marked_by: string | null
          notes: string | null
          overtime_hours: number | null
          status: string
          updated_at: string
          worked_hours: number | null
        }
        Insert: {
          absence_reason_id?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          updated_at?: string
          worked_hours?: number | null
        }
        Update: {
          absence_reason_id?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          updated_at?: string
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_absence_reason_id_fkey"
            columns: ["absence_reason_id"]
            isOneToOne: false
            referencedRelation: "absence_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_scores: {
        Row: {
          center_id: string | null
          created_at: string
          details: Json | null
          documentation_score: number
          id: string
          overall_compliance_score: number
          period_end: string
          period_start: string
          sop_completion_score: number
          timeliness_score: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          details?: Json | null
          documentation_score?: number
          id?: string
          overall_compliance_score?: number
          period_end: string
          period_start: string
          sop_completion_score?: number
          timeliness_score?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string
          details?: Json | null
          documentation_score?: number
          id?: string
          overall_compliance_score?: number
          period_end?: string
          period_start?: string
          sop_completion_score?: number
          timeliness_score?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_scores_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      candidate_outreach_logs: {
        Row: {
          candidate_id: string
          channel: string
          contacted_at: string
          contacted_by: string
          created_at: string
          decline_reason: string | null
          id: string
          interest_level: number | null
          next_followup_date: string | null
          notes: string | null
          requisition_id: string | null
          response_status: string
        }
        Insert: {
          candidate_id: string
          channel?: string
          contacted_at?: string
          contacted_by: string
          created_at?: string
          decline_reason?: string | null
          id?: string
          interest_level?: number | null
          next_followup_date?: string | null
          notes?: string | null
          requisition_id?: string | null
          response_status?: string
        }
        Update: {
          candidate_id?: string
          channel?: string
          contacted_at?: string
          contacted_by?: string
          created_at?: string
          decline_reason?: string | null
          id?: string
          interest_level?: number | null
          next_followup_date?: string | null
          notes?: string | null
          requisition_id?: string | null
          response_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_outreach_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_outreach_logs_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_requisition_links: {
        Row: {
          candidate_id: string
          current_stage: string
          id: string
          linked_at: string
          linked_by: string | null
          requisition_id: string
        }
        Insert: {
          candidate_id: string
          current_stage?: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          requisition_id: string
        }
        Update: {
          candidate_id?: string
          current_stage?: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          requisition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_requisition_links_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_requisition_links_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_stage_history: {
        Row: {
          candidate_id: string
          created_at: string
          from_stage: string | null
          id: string
          moved_by: string | null
          reason: string | null
          requisition_id: string | null
          to_stage: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          from_stage?: string | null
          id?: string
          moved_by?: string | null
          reason?: string | null
          requisition_id?: string | null
          to_stage: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          moved_by?: string | null
          reason?: string | null
          requisition_id?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_stage_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_stage_history_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_verifications: {
        Row: {
          candidate_id: string
          created_at: string
          document_url: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          verification_type: string
          verified_at: string | null
          verified_by: string | null
          waiver_approved_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          verification_type: string
          verified_at?: string | null
          verified_by?: string | null
          waiver_approved_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          verification_type?: string
          verified_at?: string | null
          verified_by?: string | null
          waiver_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_verifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          accommodation_required: boolean | null
          clinical_exposure: string[] | null
          consent_status: string | null
          created_at: string
          created_by: string | null
          current_city: string | null
          current_designation: string | null
          current_employer: string | null
          current_salary: number | null
          date_of_birth: string | null
          duplicate_of: string | null
          education: string | null
          email: string | null
          expected_ctc: number | null
          first_name: string
          gender: string | null
          id: string
          joining_availability: string | null
          lab_certification: string | null
          languages_known: string[] | null
          last_contacted_at: string | null
          last_name: string
          license_credential_type: string | null
          next_followup_date: string | null
          notes: string | null
          notice_period_days: number | null
          nursing_council_reg: string | null
          past_employers: string | null
          pharmacy_council_reg: string | null
          phone: string | null
          preferred_location: string | null
          profession_category: string | null
          psychiatry_experience_years: number | null
          rci_registration: string | null
          recruiter_owner_id: string | null
          registration_number: string | null
          registration_type: string | null
          registration_verified: boolean | null
          resume_parsed_data: Json | null
          resume_url: string | null
          shift_readiness: string | null
          skill_tags: string[] | null
          source: string
          source_details: string | null
          sourcing_stage: string | null
          status: string
          talent_pool_tags: string[] | null
          total_experience_years: number | null
          updated_at: string
          work_history: Json | null
          year_of_completion: string | null
        }
        Insert: {
          accommodation_required?: boolean | null
          clinical_exposure?: string[] | null
          consent_status?: string | null
          created_at?: string
          created_by?: string | null
          current_city?: string | null
          current_designation?: string | null
          current_employer?: string | null
          current_salary?: number | null
          date_of_birth?: string | null
          duplicate_of?: string | null
          education?: string | null
          email?: string | null
          expected_ctc?: number | null
          first_name: string
          gender?: string | null
          id?: string
          joining_availability?: string | null
          lab_certification?: string | null
          languages_known?: string[] | null
          last_contacted_at?: string | null
          last_name: string
          license_credential_type?: string | null
          next_followup_date?: string | null
          notes?: string | null
          notice_period_days?: number | null
          nursing_council_reg?: string | null
          past_employers?: string | null
          pharmacy_council_reg?: string | null
          phone?: string | null
          preferred_location?: string | null
          profession_category?: string | null
          psychiatry_experience_years?: number | null
          rci_registration?: string | null
          recruiter_owner_id?: string | null
          registration_number?: string | null
          registration_type?: string | null
          registration_verified?: boolean | null
          resume_parsed_data?: Json | null
          resume_url?: string | null
          shift_readiness?: string | null
          skill_tags?: string[] | null
          source?: string
          source_details?: string | null
          sourcing_stage?: string | null
          status?: string
          talent_pool_tags?: string[] | null
          total_experience_years?: number | null
          updated_at?: string
          work_history?: Json | null
          year_of_completion?: string | null
        }
        Update: {
          accommodation_required?: boolean | null
          clinical_exposure?: string[] | null
          consent_status?: string | null
          created_at?: string
          created_by?: string | null
          current_city?: string | null
          current_designation?: string | null
          current_employer?: string | null
          current_salary?: number | null
          date_of_birth?: string | null
          duplicate_of?: string | null
          education?: string | null
          email?: string | null
          expected_ctc?: number | null
          first_name?: string
          gender?: string | null
          id?: string
          joining_availability?: string | null
          lab_certification?: string | null
          languages_known?: string[] | null
          last_contacted_at?: string | null
          last_name?: string
          license_credential_type?: string | null
          next_followup_date?: string | null
          notes?: string | null
          notice_period_days?: number | null
          nursing_council_reg?: string | null
          past_employers?: string | null
          pharmacy_council_reg?: string | null
          phone?: string | null
          preferred_location?: string | null
          profession_category?: string | null
          psychiatry_experience_years?: number | null
          rci_registration?: string | null
          recruiter_owner_id?: string | null
          registration_number?: string | null
          registration_type?: string | null
          registration_verified?: boolean | null
          resume_parsed_data?: Json | null
          resume_url?: string | null
          shift_readiness?: string | null
          skill_tags?: string[] | null
          source?: string
          source_details?: string | null
          sourcing_stage?: string | null
          status?: string
          talent_pool_tags?: string[] | null
          total_experience_years?: number | null
          updated_at?: string
          work_history?: Json | null
          year_of_completion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      center_config: {
        Row: {
          branch_id: string
          center_head_user_id: string | null
          clinical_lead_user_id: string | null
          created_at: string
          id: string
          is_active: boolean
          total_beds: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          center_head_user_id?: string | null
          clinical_lead_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          total_beds?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          center_head_user_id?: string | null
          clinical_lead_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          total_beds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_document_templates: {
        Row: {
          created_at: string
          description: string | null
          fields_schema: Json
          id: string
          is_active: boolean
          is_mandatory_for_alert_type_id: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields_schema?: Json
          id?: string
          is_active?: boolean
          is_mandatory_for_alert_type_id?: string | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields_schema?: Json
          id?: string
          is_active?: boolean
          is_mandatory_for_alert_type_id?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_document_templates_is_mandatory_for_alert_type_id_fkey"
            columns: ["is_mandatory_for_alert_type_id"]
            isOneToOne: false
            referencedRelation: "alert_types"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_documents: {
        Row: {
          alert_id: string | null
          center_id: string | null
          created_at: string
          data: Json
          employee_id: string
          id: string
          patient_reference: string | null
          signed_at: string | null
          signed_by: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          alert_id?: string | null
          center_id?: string | null
          created_at?: string
          data?: Json
          employee_id: string
          id?: string
          patient_reference?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          alert_id?: string | null
          center_id?: string | null
          created_at?: string
          data?: Json
          employee_id?: string
          id?: string
          patient_reference?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_documents_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "clinical_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          branch_id: string | null
          created_at: string
          description: string | null
          head_user_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          level: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          level?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          level?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          employee_id: string
          expiry_date?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_structures: {
        Row: {
          basic_pay: number
          created_at: string | null
          da: number | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          esi_employee: number | null
          esi_employer: number | null
          gross_salary: number | null
          hra: number | null
          id: string
          is_active: boolean | null
          other_deductions: number | null
          pf_employee: number | null
          pf_employer: number | null
          professional_tax: number | null
          special_allowance: number | null
          tds: number | null
          updated_at: string | null
        }
        Insert: {
          basic_pay?: number
          created_at?: string | null
          da?: number | null
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          esi_employee?: number | null
          esi_employer?: number | null
          gross_salary?: number | null
          hra?: number | null
          id?: string
          is_active?: boolean | null
          other_deductions?: number | null
          pf_employee?: number | null
          pf_employer?: number | null
          professional_tax?: number | null
          special_allowance?: number | null
          tds?: number | null
          updated_at?: string | null
        }
        Update: {
          basic_pay?: number
          created_at?: string | null
          da?: number | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          esi_employee?: number | null
          esi_employer?: number | null
          gross_salary?: number | null
          hra?: number | null
          id?: string
          is_active?: boolean | null
          other_deductions?: number | null
          pf_employee?: number | null
          pf_employer?: number | null
          professional_tax?: number | null
          special_allowance?: number | null
          tds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          event_date: string
          event_description: string | null
          event_title: string
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          event_date?: string
          event_description?: string | null
          event_title: string
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          event_date?: string
          event_description?: string | null
          event_title?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_timeline_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          blood_group: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          date_of_joining: string | null
          department_id: string | null
          designation_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          last_name: string
          phone: string | null
          program_id: string | null
          reporting_to: string | null
          state: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name: string
          phone?: string | null
          program_id?: string | null
          reporting_to?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name?: string
          phone?: string | null
          program_id?: string | null
          reporting_to?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_rounds: {
        Row: {
          candidate_id: string
          completed_at: string | null
          created_at: string
          feedback_notes: string | null
          id: string
          interviewer_id: string | null
          overall_score: number | null
          recommendation: string | null
          red_flags: string | null
          requisition_id: string | null
          round_name: string
          round_number: number
          scheduled_at: string | null
          scorecard: Json | null
          status: string
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          feedback_notes?: string | null
          id?: string
          interviewer_id?: string | null
          overall_score?: number | null
          recommendation?: string | null
          red_flags?: string | null
          requisition_id?: string | null
          round_name: string
          round_number?: number
          scheduled_at?: string | null
          scorecard?: Json | null
          status?: string
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          feedback_notes?: string | null
          id?: string
          interviewer_id?: string | null
          overall_score?: number | null
          recommendation?: string | null
          red_flags?: string | null
          requisition_id?: string | null
          round_name?: string
          round_number?: number
          scheduled_at?: string | null
          scorecard?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_rounds_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_rounds_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          benefits: string | null
          branch_id: string | null
          budget_max: number | null
          budget_min: number | null
          category: string
          created_at: string
          department_id: string | null
          designation_id: string | null
          employment_type: string
          gender_preference: string | null
          headcount: number
          hiring_manager_id: string | null
          id: string
          job_description: string | null
          justification: string | null
          key_responsibilities: string | null
          location_details: string | null
          preferred_experience_years: number | null
          preferred_skills: string | null
          program_id: string | null
          recruiter_id: string | null
          requested_by: string
          required_credentials: string[] | null
          required_qualifications: string | null
          screening_template_id: string | null
          shift_pattern: string | null
          status: string
          target_join_date: string | null
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          benefits?: string | null
          branch_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          employment_type?: string
          gender_preference?: string | null
          headcount?: number
          hiring_manager_id?: string | null
          id?: string
          job_description?: string | null
          justification?: string | null
          key_responsibilities?: string | null
          location_details?: string | null
          preferred_experience_years?: number | null
          preferred_skills?: string | null
          program_id?: string | null
          recruiter_id?: string | null
          requested_by: string
          required_credentials?: string[] | null
          required_qualifications?: string | null
          screening_template_id?: string | null
          shift_pattern?: string | null
          status?: string
          target_join_date?: string | null
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          benefits?: string | null
          branch_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          employment_type?: string
          gender_preference?: string | null
          headcount?: number
          hiring_manager_id?: string | null
          id?: string
          job_description?: string | null
          justification?: string | null
          key_responsibilities?: string | null
          location_details?: string | null
          preferred_experience_years?: number | null
          preferred_skills?: string | null
          program_id?: string | null
          recruiter_id?: string | null
          requested_by?: string
          required_credentials?: string[] | null
          required_qualifications?: string | null
          screening_template_id?: string | null
          shift_pattern?: string | null
          status?: string
          target_join_date?: string | null
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requisitions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_screening_template_id_fkey"
            columns: ["screening_template_id"]
            isOneToOne: false
            referencedRelation: "screening_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          formula_type: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          target_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          formula_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          formula_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_entries: {
        Row: {
          center_id: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          kpi_definition_id: string
          notes: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          kpi_definition_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          kpi_definition_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_entries_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_entries_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_accrual_logs: {
        Row: {
          accrual_date: string
          amount: number
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          leave_type_id: string
          notes: string | null
          type: string
        }
        Insert: {
          accrual_date: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          leave_type_id: string
          notes?: string | null
          type?: string
        }
        Update: {
          accrual_date?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          leave_type_id?: string
          notes?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_accrual_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_accrual_logs_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_accrual_rules: {
        Row: {
          accrual_method: string
          carry_forward_cap: number | null
          created_at: string | null
          encashment_allowed: boolean | null
          id: string
          is_active: boolean | null
          leave_type_id: string
          max_encashment_days: number | null
          posting_frequency: string
          proration_rule: string | null
          tenure_threshold_months: number | null
        }
        Insert: {
          accrual_method?: string
          carry_forward_cap?: number | null
          created_at?: string | null
          encashment_allowed?: boolean | null
          id?: string
          is_active?: boolean | null
          leave_type_id: string
          max_encashment_days?: number | null
          posting_frequency?: string
          proration_rule?: string | null
          tenure_threshold_months?: number | null
        }
        Update: {
          accrual_method?: string
          carry_forward_cap?: number | null
          created_at?: string | null
          encashment_allowed?: boolean | null
          id?: string
          is_active?: boolean | null
          leave_type_id?: string
          max_encashment_days?: number | null
          posting_frequency?: string
          proration_rule?: string | null
          tenure_threshold_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_accrual_rules_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_approval_chains: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          leave_type_id: string | null
          min_days: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          leave_type_id?: string | null
          min_days?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          leave_type_id?: string | null
          min_days?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_approval_chains_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_approval_chains_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_approval_steps: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          approver_role: string | null
          approver_user_id: string | null
          chain_id: string
          created_at: string | null
          id: string
          leave_request_id: string | null
          notes: string | null
          sequence_number: number
          sla_hours: number | null
          status: string | null
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          chain_id: string
          created_at?: string | null
          id?: string
          leave_request_id?: string | null
          notes?: string | null
          sequence_number?: number
          sla_hours?: number | null
          status?: string | null
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          chain_id?: string
          created_at?: string | null
          id?: string
          leave_request_id?: string | null
          notes?: string | null
          sequence_number?: number
          sla_hours?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_approval_steps_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "leave_approval_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_approval_steps_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          carried_forward: number
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          total_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_forward?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          total_days?: number
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          carried_forward?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_coverage_rules: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          min_staff_count: number
          role_designation_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          min_staff_count?: number
          role_designation_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          min_staff_count?: number
          role_designation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_coverage_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_coverage_rules_role_designation_id_fkey"
            columns: ["role_designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_of_absence_cases: {
        Row: {
          actual_return_date: string | null
          case_type: string
          contact_log: Json | null
          created_at: string | null
          employee_id: string
          expected_return_date: string | null
          fitness_clearance: boolean | null
          id: string
          leave_request_id: string
          medical_certificate_status: string | null
          medical_certificate_url: string | null
          notes: string | null
          return_to_work_checklist: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_return_date?: string | null
          case_type: string
          contact_log?: Json | null
          created_at?: string | null
          employee_id: string
          expected_return_date?: string | null
          fitness_clearance?: boolean | null
          id?: string
          leave_request_id: string
          medical_certificate_status?: string | null
          medical_certificate_url?: string | null
          notes?: string | null
          return_to_work_checklist?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_return_date?: string | null
          case_type?: string
          contact_log?: Json | null
          created_at?: string | null
          employee_id?: string
          expected_return_date?: string | null
          fitness_clearance?: boolean | null
          id?: string
          leave_request_id?: string
          medical_certificate_status?: string | null
          medical_certificate_url?: string | null
          notes?: string | null
          return_to_work_checklist?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_of_absence_cases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_of_absence_cases_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_overrides: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          leave_request_id: string
          override_type: string
          reason: string
          requested_by: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          leave_request_id: string
          override_type: string
          reason: string
          requested_by: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          leave_request_id?: string
          override_type?: string
          reason?: string
          requested_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_overrides_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          blackout_dates: Json | null
          branch_id: string | null
          created_at: string | null
          department_id: string | null
          designation_id: string | null
          effective_from: string
          effective_to: string | null
          employment_type: string | null
          id: string
          is_active: boolean | null
          leave_type_id: string
          max_continuous_days: number | null
          min_tenure_months: number | null
          name: string
          notice_days_required: number | null
        }
        Insert: {
          blackout_dates?: Json | null
          branch_id?: string | null
          created_at?: string | null
          department_id?: string | null
          designation_id?: string | null
          effective_from?: string
          effective_to?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean | null
          leave_type_id: string
          max_continuous_days?: number | null
          min_tenure_months?: number | null
          name: string
          notice_days_required?: number | null
        }
        Update: {
          blackout_dates?: Json | null
          branch_id?: string | null
          created_at?: string | null
          department_id?: string | null
          designation_id?: string | null
          effective_from?: string
          effective_to?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean | null
          leave_type_id?: string
          max_continuous_days?: number | null
          min_tenure_months?: number | null
          name?: string
          notice_days_required?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          document_url: string | null
          employee_id: string
          end_date: string
          half_day: string | null
          id: string
          leave_type_id: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          total_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_url?: string | null
          employee_id: string
          end_date: string
          half_day?: string | null
          id?: string
          leave_type_id: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          total_days: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_url?: string | null
          employee_id?: string
          end_date?: string
          half_day?: string | null
          id?: string
          leave_type_id?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_paid: boolean
          max_days_per_year: number
          name: string
          requires_document: boolean
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_days_per_year?: number
          name: string
          requires_document?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_days_per_year?: number
          name?: string
          requires_document?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          accepted_at: string | null
          approved_by: string | null
          branch_id: string | null
          candidate_id: string
          compensation_details: Json | null
          created_at: string
          created_by: string | null
          decline_reason: string | null
          department_id: string | null
          designation_id: string | null
          id: string
          joining_date: string | null
          offer_expiry_date: string | null
          requisition_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          candidate_id: string
          compensation_details?: Json | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          department_id?: string | null
          designation_id?: string | null
          id?: string
          joining_date?: string | null
          offer_expiry_date?: string | null
          requisition_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          candidate_id?: string
          compensation_details?: Json | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          department_id?: string | null
          designation_id?: string | null
          id?: string
          joining_date?: string | null
          offer_expiry_date?: string | null
          requisition_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_cases: {
        Row: {
          branch_id: string | null
          buddy_id: string | null
          candidate_id: string | null
          clearance_status: string
          created_at: string
          current_stage: Database["public"]["Enums"]["onboarding_stage"]
          department_id: string | null
          designation_id: string | null
          employee_id: string | null
          id: string
          joining_date: string | null
          offer_id: string | null
          onboarding_owner_id: string | null
          readiness_score: number
          requisition_id: string | null
          role_family: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          buddy_id?: string | null
          candidate_id?: string | null
          clearance_status?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["onboarding_stage"]
          department_id?: string | null
          designation_id?: string | null
          employee_id?: string | null
          id?: string
          joining_date?: string | null
          offer_id?: string | null
          onboarding_owner_id?: string | null
          readiness_score?: number
          requisition_id?: string | null
          role_family?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          buddy_id?: string | null
          candidate_id?: string | null
          clearance_status?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["onboarding_stage"]
          department_id?: string | null
          designation_id?: string | null
          employee_id?: string | null
          id?: string
          joining_date?: string | null
          offer_id?: string | null
          onboarding_owner_id?: string | null
          readiness_score?: number
          requisition_id?: string | null
          role_family?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_cases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_competencies: {
        Row: {
          case_id: string
          competency_name: string
          created_at: string
          group_name: string | null
          id: string
          independent: boolean
          independent_at: string | null
          independent_by: string | null
          observed: boolean
          observed_at: string | null
          observed_by: string | null
          reviewer_notes: string | null
          supervised: boolean
          supervised_at: string | null
          supervised_by: string | null
        }
        Insert: {
          case_id: string
          competency_name: string
          created_at?: string
          group_name?: string | null
          id?: string
          independent?: boolean
          independent_at?: string | null
          independent_by?: string | null
          observed?: boolean
          observed_at?: string | null
          observed_by?: string | null
          reviewer_notes?: string | null
          supervised?: boolean
          supervised_at?: string | null
          supervised_by?: string | null
        }
        Update: {
          case_id?: string
          competency_name?: string
          created_at?: string
          group_name?: string | null
          id?: string
          independent?: boolean
          independent_at?: string | null
          independent_by?: string | null
          observed?: boolean
          observed_at?: string | null
          observed_by?: string | null
          reviewer_notes?: string | null
          supervised?: boolean
          supervised_at?: string | null
          supervised_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_competencies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_documents: {
        Row: {
          case_id: string
          created_at: string
          doc_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          is_mandatory: boolean
          notes: string | null
          reviewer_id: string | null
          upload_by: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          doc_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          reviewer_id?: string | null
          upload_by?: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          reviewer_id?: string | null
          upload_by?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_plans: {
        Row: {
          buddy_employee_id: string | null
          candidate_id: string | null
          created_at: string
          employee_id: string | null
          id: string
          items: Json | null
          plan_type: string
          status: string
          updated_at: string
        }
        Insert: {
          buddy_employee_id?: string | null
          candidate_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          items?: Json | null
          plan_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          buddy_employee_id?: string | null
          candidate_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          items?: Json | null
          plan_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_plans_buddy_employee_id_fkey"
            columns: ["buddy_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_plans_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_plans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_stage_history: {
        Row: {
          case_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["onboarding_stage"] | null
          id: string
          moved_by: string | null
          reason: string | null
          to_stage: Database["public"]["Enums"]["onboarding_stage"]
        }
        Insert: {
          case_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["onboarding_stage"] | null
          id?: string
          moved_by?: string | null
          reason?: string | null
          to_stage: Database["public"]["Enums"]["onboarding_stage"]
        }
        Update: {
          case_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["onboarding_stage"] | null
          id?: string
          moved_by?: string | null
          reason?: string | null
          to_stage?: Database["public"]["Enums"]["onboarding_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_stage_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string | null
          evidence_url: string | null
          id: string
          is_mandatory: boolean
          notes: string | null
          owner_role: string | null
          owner_user_id: string | null
          stage: Database["public"]["Enums"]["onboarding_stage"]
          status: string
          task_name: string
          task_type: string
          template_block_ref: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          owner_role?: string | null
          owner_user_id?: string | null
          stage?: Database["public"]["Enums"]["onboarding_stage"]
          status?: string
          task_name: string
          task_type?: string
          template_block_ref?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          owner_role?: string | null
          owner_user_id?: string | null
          stage?: Database["public"]["Enums"]["onboarding_stage"]
          status?: string
          task_name?: string
          task_type?: string
          template_block_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role_family: string
          stage_blocks: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          role_family: string
          stage_blocks?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role_family?: string
          stage_blocks?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      payroll_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          applied_in_run_id: string | null
          approved_by: string | null
          component_name: string
          created_at: string | null
          created_by: string | null
          effective_period_end: string | null
          effective_period_start: string | null
          employee_id: string
          id: string
          is_recurring: boolean | null
          reason: string | null
          recurrence_end: string | null
          status: string | null
        }
        Insert: {
          adjustment_type?: string
          amount?: number
          applied_in_run_id?: string | null
          approved_by?: string | null
          component_name: string
          created_at?: string | null
          created_by?: string | null
          effective_period_end?: string | null
          effective_period_start?: string | null
          employee_id: string
          id?: string
          is_recurring?: boolean | null
          reason?: string | null
          recurrence_end?: string | null
          status?: string | null
        }
        Update: {
          adjustment_type?: string
          amount?: number
          applied_in_run_id?: string | null
          approved_by?: string | null
          component_name?: string
          created_at?: string | null
          created_by?: string | null
          effective_period_end?: string | null
          effective_period_start?: string | null
          employee_id?: string
          id?: string
          is_recurring?: boolean | null
          reason?: string | null
          recurrence_end?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_disputes: {
        Row: {
          created_at: string | null
          description: string
          dispute_type: string
          employee_id: string
          id: string
          line_item_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          dispute_type: string
          employee_id: string
          id?: string
          line_item_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          dispute_type?: string
          employee_id?: string
          id?: string
          line_item_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_disputes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_disputes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_exceptions: {
        Row: {
          created_at: string | null
          description: string
          employee_id: string | null
          exception_type: string
          id: string
          owner_id: string | null
          period_id: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          sla_due_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          employee_id?: string | null
          exception_type: string
          id?: string
          owner_id?: string | null
          period_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          sla_due_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          employee_id?: string | null
          exception_type?: string
          id?: string
          owner_id?: string | null
          period_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          sla_due_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_exceptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_exceptions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_line_items: {
        Row: {
          adjustments_deduction: number | null
          adjustments_earning: number | null
          arrears: number | null
          basic_pay: number | null
          created_at: string | null
          da: number | null
          days_absent: number | null
          days_leave_paid: number | null
          days_leave_unpaid: number | null
          days_present: number | null
          employee_id: string
          esi_employee: number | null
          esi_employer: number | null
          gross_pay: number | null
          hra: number | null
          id: string
          lop_days: number | null
          lop_deduction: number | null
          net_pay: number | null
          other_deductions: number | null
          overtime_hours: number | null
          overtime_pay: number | null
          pf_employee: number | null
          pf_employer: number | null
          previous_period_net: number | null
          professional_tax: number | null
          run_id: string
          special_allowance: number | null
          status: string | null
          tds: number | null
          total_deductions: number | null
          variance_pct: number | null
          working_days: number | null
        }
        Insert: {
          adjustments_deduction?: number | null
          adjustments_earning?: number | null
          arrears?: number | null
          basic_pay?: number | null
          created_at?: string | null
          da?: number | null
          days_absent?: number | null
          days_leave_paid?: number | null
          days_leave_unpaid?: number | null
          days_present?: number | null
          employee_id: string
          esi_employee?: number | null
          esi_employer?: number | null
          gross_pay?: number | null
          hra?: number | null
          id?: string
          lop_days?: number | null
          lop_deduction?: number | null
          net_pay?: number | null
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          pf_employee?: number | null
          pf_employer?: number | null
          previous_period_net?: number | null
          professional_tax?: number | null
          run_id: string
          special_allowance?: number | null
          status?: string | null
          tds?: number | null
          total_deductions?: number | null
          variance_pct?: number | null
          working_days?: number | null
        }
        Update: {
          adjustments_deduction?: number | null
          adjustments_earning?: number | null
          arrears?: number | null
          basic_pay?: number | null
          created_at?: string | null
          da?: number | null
          days_absent?: number | null
          days_leave_paid?: number | null
          days_leave_unpaid?: number | null
          days_present?: number | null
          employee_id?: string
          esi_employee?: number | null
          esi_employer?: number | null
          gross_pay?: number | null
          hra?: number | null
          id?: string
          lop_days?: number | null
          lop_deduction?: number | null
          net_pay?: number | null
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          pf_employee?: number | null
          pf_employer?: number | null
          previous_period_net?: number | null
          professional_tax?: number | null
          run_id?: string
          special_allowance?: number | null
          status?: string | null
          tds?: number | null
          total_deductions?: number | null
          variance_pct?: number | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_line_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          locked_at: string | null
          locked_by: string | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_count: number | null
          id: string
          notes: string | null
          period_id: string
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_by: string | null
          run_date: string
          run_type: string | null
          status: string
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_count?: number | null
          id?: string
          notes?: string | null
          period_id: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_by?: string | null
          run_date?: string
          run_type?: string | null
          status?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_count?: number | null
          id?: string
          notes?: string | null
          period_id?: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_by?: string | null
          run_date?: string
          run_type?: string | null
          status?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      preboarding_tasks: {
        Row: {
          candidate_id: string
          category: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          task_name: string
        }
        Insert: {
          candidate_id: string
          category?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          task_name: string
        }
        Update: {
          candidate_id?: string
          category?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "preboarding_tasks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      probation_reviews: {
        Row: {
          attendance_score: number | null
          behavior_score: number | null
          competency_score: number | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          outcome: string
          overall_assessment: string | null
          review_type: string
          reviewed_at: string | null
          reviewer_id: string | null
        }
        Insert: {
          attendance_score?: number | null
          behavior_score?: number | null
          competency_score?: number | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          outcome?: string
          overall_assessment?: string | null
          review_type?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
        }
        Update: {
          attendance_score?: number | null
          behavior_score?: number | null
          competency_score?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          outcome?: string
          overall_assessment?: string | null
          review_type?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "probation_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          program_director_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          program_director_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          program_director_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regularization_requests: {
        Row: {
          attendance_record_id: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          reason: string
          requested_clock_in: string | null
          requested_clock_out: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          attendance_record_id?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          reason: string
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          attendance_record_id?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          reason?: string
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "regularization_requests_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regularization_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_chains: {
        Row: {
          chain_type: string
          created_at: string
          id: string
          is_active: boolean
          reports_to_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chain_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          reports_to_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chain_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          reports_to_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requisition_approvals: {
        Row: {
          acted_at: string | null
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          requisition_id: string
          sequence_number: number
          status: string
        }
        Insert: {
          acted_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          requisition_id: string
          sequence_number?: number
          status?: string
        }
        Update: {
          acted_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          requisition_id?: string
          sequence_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_approvals_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_action_items: {
        Row: {
          created_at: string
          deadline: string | null
          description: string
          id: string
          notes: string | null
          owner_user_id: string
          review_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          notes?: string | null
          owner_user_id: string
          review_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          notes?: string | null
          owner_user_id?: string
          review_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_action_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_agenda_items: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          review_id: string
          section: string
          sort_order: number
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          review_id: string
          section: string
          sort_order?: number
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          review_id?: string
          section?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_agenda_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sessions: {
        Row: {
          center_id: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_sessions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          shift_template_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          shift_template_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          shift_template_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_assignments_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_week_status: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          published_at: string | null
          published_by: string | null
          status: string
          week_start_date: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          week_start_date: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_week_status_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_exceptions: {
        Row: {
          approver_id: string | null
          created_at: string
          decided_at: string | null
          decision: string
          decision_notes: string | null
          failed_rule_id: string | null
          id: string
          reason: string
          requested_by: string
          run_id: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          decision_notes?: string | null
          failed_rule_id?: string | null
          id?: string
          reason: string
          requested_by: string
          run_id: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          decision_notes?: string | null
          failed_rule_id?: string | null
          id?: string
          reason?: string
          requested_by?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_exceptions_failed_rule_id_fkey"
            columns: ["failed_rule_id"]
            isOneToOne: false
            referencedRelation: "screening_template_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_exceptions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "screening_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_forms: {
        Row: {
          answers: Json | null
          candidate_id: string
          compensation_fit: string | null
          created_at: string
          id: string
          knockout_passed: boolean | null
          location_fit: string | null
          notice_fit: string | null
          overall_result: string
          requisition_id: string | null
          risk_notes: string | null
          screened_by: string | null
        }
        Insert: {
          answers?: Json | null
          candidate_id: string
          compensation_fit?: string | null
          created_at?: string
          id?: string
          knockout_passed?: boolean | null
          location_fit?: string | null
          notice_fit?: string | null
          overall_result?: string
          requisition_id?: string | null
          risk_notes?: string | null
          screened_by?: string | null
        }
        Update: {
          answers?: Json | null
          candidate_id?: string
          compensation_fit?: string | null
          created_at?: string
          id?: string
          knockout_passed?: boolean | null
          location_fit?: string | null
          notice_fit?: string | null
          overall_result?: string
          requisition_id?: string | null
          risk_notes?: string | null
          screened_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_forms_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_forms_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_result_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outcome: string
          points_awarded: number
          question_id: string | null
          rule_id: string | null
          run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          points_awarded?: number
          question_id?: string | null
          rule_id?: string | null
          run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          points_awarded?: number
          question_id?: string | null
          rule_id?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_result_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "screening_template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_result_items_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "screening_template_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_result_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "screening_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_runs: {
        Row: {
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          knockout_failed: boolean
          red_flags: string[] | null
          requisition_id: string | null
          result_band: string
          run_by: string | null
          status: string
          template_id: string
          total_score: number
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          knockout_failed?: boolean
          red_flags?: string[] | null
          requisition_id?: string | null
          result_band?: string
          run_by?: string | null
          status?: string
          template_id: string
          total_score?: number
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          knockout_failed?: boolean
          red_flags?: string[] | null
          requisition_id?: string | null
          result_band?: string
          run_by?: string | null
          status?: string
          template_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "screening_runs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_runs_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "screening_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_template_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          id: string
          is_mandatory: boolean
          stage_required_at: string
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          id?: string
          is_mandatory?: boolean
          stage_required_at?: string
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          id?: string
          is_mandatory?: boolean
          stage_required_at?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_template_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "screening_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_template_questions: {
        Row: {
          created_at: string
          id: string
          is_mandatory: boolean
          max_score: number
          question_text: string
          response_type: string
          scoring_logic: Json | null
          sort_order: number
          stage: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          max_score?: number
          question_text: string
          response_type?: string
          scoring_logic?: Json | null
          sort_order?: number
          stage?: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          max_score?: number
          question_text?: string
          response_type?: string
          scoring_logic?: Json | null
          sort_order?: number
          stage?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "screening_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_template_rules: {
        Row: {
          created_at: string
          description: string | null
          fail_action: string
          field_name: string
          id: string
          label: string | null
          operator: string
          rule_type: string
          template_id: string
          threshold_value: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          fail_action?: string
          field_name: string
          id?: string
          label?: string | null
          operator?: string
          rule_type?: string
          template_id: string
          threshold_value?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          fail_action?: string
          field_name?: string
          id?: string
          label?: string | null
          operator?: string
          rule_type?: string
          template_id?: string
          threshold_value?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "screening_template_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "screening_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_templates: {
        Row: {
          approved_by: string | null
          branches: string[] | null
          created_at: string
          created_by: string
          description: string | null
          effective_from: string | null
          hold_threshold: number
          id: string
          job_family: string
          name: string
          pass_threshold: number
          reject_threshold: number
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_by?: string | null
          branches?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          effective_from?: string | null
          hold_threshold?: number
          id?: string
          job_family?: string
          name: string
          pass_threshold?: number
          reject_threshold?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_by?: string | null
          branches?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          effective_from?: string | null
          hold_threshold?: number
          id?: string
          job_family?: string
          name?: string
          pass_threshold?: number
          reject_threshold?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      shift_templates: {
        Row: {
          branch_id: string | null
          break_minutes: number
          color: string | null
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          break_minutes?: number
          color?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          break_minutes?: number
          color?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_plans: {
        Row: {
          channels: string[] | null
          created_at: string
          hiring_manager_id: string | null
          id: string
          recruiter_id: string
          requisition_id: string
          sla_days: number | null
          status: string
          target_count: number | null
          target_join_date: string | null
          updated_at: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          hiring_manager_id?: string | null
          id?: string
          recruiter_id: string
          requisition_id: string
          sla_days?: number | null
          status?: string
          target_count?: number | null
          target_join_date?: string | null
          updated_at?: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          hiring_manager_id?: string | null
          id?: string
          recruiter_id?: string
          requisition_id?: string
          sla_days?: number | null
          status?: string
          target_count?: number | null
          target_join_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_plans_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_certifications: {
        Row: {
          certificate_url: string | null
          certification_level: string
          certification_name: string
          certified_date: string
          created_at: string
          employee_id: string
          expiry_date: string | null
          id: string
          issued_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          certification_level?: string
          certification_name: string
          certified_date: string
          created_at?: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          certification_level?: string
          certification_name?: string
          certified_date?: string
          created_at?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_members: {
        Row: {
          added_by: string | null
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          re_engagement_date: string | null
          talent_pool_id: string
        }
        Insert: {
          added_by?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          re_engagement_date?: string | null
          talent_pool_id: string
        }
        Update: {
          added_by?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          re_engagement_date?: string | null
          talent_pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_members_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_members_talent_pool_id_fkey"
            columns: ["talent_pool_id"]
            isOneToOne: false
            referencedRelation: "talent_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          pool_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          pool_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pool_type?: string
        }
        Relationships: []
      }
      training_courses: {
        Row: {
          category: string
          certification_level: string
          code: string
          created_at: string
          description: string | null
          duration_hours: number
          id: string
          is_active: boolean
          is_mandatory: boolean
          name: string
          target_roles: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          certification_level?: string
          code: string
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name: string
          target_roles?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          certification_level?: string
          code?: string
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name?: string
          target_roles?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      training_enrollments: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          employee_id: string
          enrolled_at: string
          id: string
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          employee_id: string
          enrolled_at?: string
          id?: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          employee_id?: string
          enrolled_at?: string
          id?: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_hr: { Args: { _user_id: string }; Returns: boolean }
      is_center_head_or_above: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_category: "clinical" | "operations" | "business" | "financial"
      alert_severity: "L1" | "L2" | "L3"
      alert_status:
        | "triggered"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "escalated"
        | "closed"
      app_role:
        | "super_admin"
        | "hr_manager"
        | "department_head"
        | "staff"
        | "center_head"
        | "clinical_lead"
        | "program_director"
        | "ward_incharge"
        | "duty_medical_officer"
        | "psychologist"
        | "psw"
        | "admission_counsellor"
        | "nursing_head"
        | "rehab_coordinator"
      employee_status:
        | "active"
        | "onboarding"
        | "probation"
        | "notice_period"
        | "suspended"
        | "terminated"
        | "resigned"
      gender_type: "male" | "female" | "other"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      onboarding_stage:
        | "offer_accepted"
        | "preboarding"
        | "joining_review"
        | "day1_orientation"
        | "dept_induction"
        | "role_induction"
        | "supervised_practice"
        | "competency_signoff"
        | "deployment_clearance"
        | "integration_30_60_90"
        | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_category: ["clinical", "operations", "business", "financial"],
      alert_severity: ["L1", "L2", "L3"],
      alert_status: [
        "triggered",
        "acknowledged",
        "in_progress",
        "resolved",
        "escalated",
        "closed",
      ],
      app_role: [
        "super_admin",
        "hr_manager",
        "department_head",
        "staff",
        "center_head",
        "clinical_lead",
        "program_director",
        "ward_incharge",
        "duty_medical_officer",
        "psychologist",
        "psw",
        "admission_counsellor",
        "nursing_head",
        "rehab_coordinator",
      ],
      employee_status: [
        "active",
        "onboarding",
        "probation",
        "notice_period",
        "suspended",
        "terminated",
        "resigned",
      ],
      gender_type: ["male", "female", "other"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      onboarding_stage: [
        "offer_accepted",
        "preboarding",
        "joining_review",
        "day1_orientation",
        "dept_induction",
        "role_induction",
        "supervised_practice",
        "competency_signoff",
        "deployment_clearance",
        "integration_30_60_90",
        "completed",
      ],
    },
  },
} as const
