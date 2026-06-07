// Pre-built onboarding frameworks for common role families at Mindful HR

export interface FrameworkTask {
  name: string;
  type: string;
  owner_role: string;
  evidence_required: boolean;
  sla_days: number;
  group?: string;
}

export interface FrameworkStage {
  stage: string;
  tasks: FrameworkTask[];
}

export interface FrameworkCompetency {
  competency_name: string;
  group_name: string;
}

export interface OnboardingFramework {
  name: string;
  role_family: string;
  stage_blocks: FrameworkStage[];
  competencies: FrameworkCompetency[];
}

export const PSW_FRAMEWORK: OnboardingFramework = {
  name: "PSW Onboarding - Mindful HR",
  role_family: "Psychiatric Social Worker",
  stage_blocks: [
    {
      stage: "preboarding",
      tasks: [
        { name: "Offer letter confirmed and signed", type: "document", owner_role: "hr", evidence_required: true, sla_days: 1, group: "Documentation" },
        { name: "RCI registration certificate collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "MSW degree certificate collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "ID proof and address proof collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "Experience summary and reference letters", type: "document", owner_role: "hr", evidence_required: true, sla_days: 5, group: "Documentation" },
        { name: "Buddy assigned from clinical team", type: "checklist", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "Shift schedule and roster shared", type: "checklist", owner_role: "hr", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "IT access and app login planned", type: "access", owner_role: "it_admin", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "Document completeness check (≥80%)", type: "sign_off", owner_role: "hr", evidence_required: true, sla_days: 5, group: "Compliance" },
      ],
    },
    {
      stage: "day1_orientation",
      tasks: [
        { name: "Introduction to Mindful HR services and philosophy", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Organisation" },
        { name: "Code of conduct and confidentiality policy signed", type: "document", owner_role: "hr", evidence_required: true, sla_days: 1, group: "Compliance" },
        { name: "App setup, attendance system, and login verification", type: "access", owner_role: "it_admin", evidence_required: true, sla_days: 1, group: "Systems" },
        { name: "Incident reporting protocol walkthrough", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Safety" },
        { name: "Fire safety and emergency drill orientation", type: "training", owner_role: "trainer", evidence_required: false, sla_days: 1, group: "Safety" },
        { name: "Documentation standards and charting protocol", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Clinical" },
        { name: "HR and payroll introduction", type: "checklist", owner_role: "hr", evidence_required: false, sla_days: 1, group: "Admin" },
      ],
    },
    {
      stage: "dept_induction",
      tasks: [
        { name: "Daily MSE follow-up protocol training", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "MSE Workflow" },
        { name: "Observe 3 MSE follow-up sessions", type: "training", owner_role: "buddy", evidence_required: true, sla_days: 5, group: "MSE Workflow" },
        { name: "Family communication protocol training", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Family Communication" },
        { name: "Observe 2 family communication calls", type: "training", owner_role: "buddy", evidence_required: true, sla_days: 5, group: "Family Communication" },
        { name: "Admission psychosocial assessment training", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Admission" },
        { name: "MDT (multidisciplinary team) workflow walkthrough", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "MDT Workflow" },
        { name: "Attend 2 MDT meetings as observer", type: "training", owner_role: "buddy", evidence_required: true, sla_days: 7, group: "MDT Workflow" },
        { name: "Discharge planning and barrier assessment training", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 5, group: "Discharge Planning" },
        { name: "Risk escalation protocol and safety planning", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Risk Escalation" },
        { name: "Documentation quality standards walkthrough", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Documentation Quality" },
      ],
    },
    {
      stage: "role_induction",
      tasks: [
        { name: "Role-specific KRA and KPI briefing", type: "training", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Performance" },
        { name: "Caseload structure and patient allocation model", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 2, group: "Operations" },
        { name: "PSW-specific documentation templates walkthrough", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 2, group: "Documentation" },
        { name: "Boundary and confidentiality workshop", type: "training", owner_role: "clinical_lead", evidence_required: true, sla_days: 3, group: "Ethics" },
        { name: "Review PSW handbook and SOP acknowledgement", type: "sign_off", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Compliance" },
      ],
    },
    {
      stage: "supervised_practice",
      tasks: [
        { name: "Assist in 3 family communication calls", type: "sign_off", owner_role: "buddy", evidence_required: true, sla_days: 7, group: "Family Calls" },
        { name: "Complete 5 documentation entries under review", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 10, group: "Documentation" },
        { name: "Take 2 independent patient assignments (supervised)", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 10, group: "Patient Care" },
        { name: "Handle 3 routine follow-up sessions independently", type: "sign_off", owner_role: "buddy", evidence_required: true, sla_days: 14, group: "Follow-ups" },
        { name: "Manage defined caseload for 1 week", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 21, group: "Caseload" },
      ],
    },
    {
      stage: "competency_signoff",
      tasks: [
        { name: "All 8 competencies signed off at Independent level", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 28, group: "Competency Review" },
        { name: "Supervisor overall assessment completed", type: "sign_off", owner_role: "department_head", evidence_required: true, sla_days: 28, group: "Competency Review" },
      ],
    },
    {
      stage: "deployment_clearance",
      tasks: [
        { name: "Final clearance decision — select clearance level", type: "sign_off", owner_role: "center_head", evidence_required: true, sla_days: 30, group: "Clearance" },
      ],
    },
  ],
  competencies: [
    { competency_name: "Takes psychosocial history", group_name: "Assessment" },
    { competency_name: "Daily MSE follow-up documentation", group_name: "Assessment" },
    { competency_name: "Family call logging and communication", group_name: "Communication" },
    { competency_name: "MDT participation and input", group_name: "Teamwork" },
    { competency_name: "Risk escalation and safety planning", group_name: "Clinical Safety" },
    { competency_name: "Discharge barrier identification and planning", group_name: "Discharge" },
    { competency_name: "Professional boundaries and confidentiality", group_name: "Ethics" },
    { competency_name: "App usage and digital documentation", group_name: "Systems" },
  ],
};

export const STAFF_NURSE_FRAMEWORK: OnboardingFramework = {
  name: "Staff Nurse Onboarding - Mindful HR",
  role_family: "Staff Nurse",
  stage_blocks: [
    {
      stage: "preboarding",
      tasks: [
        { name: "Offer accepted and joining date confirmed", type: "document", owner_role: "hr", evidence_required: true, sla_days: 1, group: "Documentation" },
        { name: "Qualification certificates and nursing council registration collected and verified", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "Identity, address, bank, and statutory documents collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "Previous employment history, references, and experience summary", type: "document", owner_role: "hr", evidence_required: true, sla_days: 5, group: "Documentation" },
        { name: "Center, ward, and expected duty pattern confirmed", type: "checklist", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "Preceptor or senior nurse assigned", type: "checklist", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "Buddy assigned where applicable", type: "checklist", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "First-week onboarding schedule shared", type: "checklist", owner_role: "hr", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "HRIS/app access, attendance enrollment, and device readiness planned", type: "access", owner_role: "it_admin", evidence_required: false, sla_days: 2, group: "Systems" },
        { name: "Role posting confirmed (psychiatry IP, de-addiction, rehab, observation/high-risk ward, OP support)", type: "checklist", owner_role: "department_head", evidence_required: false, sla_days: 3, group: "Preparation" },
      ],
    },
    {
      stage: "day1_orientation",
      tasks: [
        { name: "Introduction to Mindful HR services, locations, and care philosophy", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Organisation" },
        { name: "Code of conduct, confidentiality, and professional boundaries signed", type: "document", owner_role: "hr", evidence_required: true, sla_days: 1, group: "Compliance" },
        { name: "App login, attendance, leave, and escalation channels setup", type: "access", owner_role: "it_admin", evidence_required: true, sla_days: 1, group: "Systems" },
        { name: "Incident reporting and workplace safety response orientation", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Safety" },
        { name: "Fire, infection-control, and emergency response process", type: "training", owner_role: "trainer", evidence_required: false, sla_days: 1, group: "Safety" },
        { name: "Overview of documentation standards for psychiatric care", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Clinical" },
        { name: "HR, payroll, shift system, and supervisor introduction", type: "checklist", owner_role: "hr", evidence_required: false, sla_days: 1, group: "Admin" },
      ],
    },
    {
      stage: "dept_induction",
      tasks: [
        { name: "Medication round workflow, psychotropic precautions, double-check rules, omission escalation", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Medication Administration" },
        { name: "Observe 2 medication rounds with preceptor", type: "training", owner_role: "buddy", evidence_required: true, sla_days: 5, group: "Medication Administration" },
        { name: "Observation levels, 1:1 watch expectations, check frequency, overdue response", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Observation & Watch Duty" },
        { name: "Observe one full watch-duty cycle with senior nurse", type: "training", owner_role: "buddy", evidence_required: true, sla_days: 5, group: "Observation & Watch Duty" },
        { name: "Aggression recognition, suicide risk, withdrawal deterioration, absconding protocol", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Behavioral & Safety Escalation" },
        { name: "De-escalation techniques and restraint protocol training", type: "training", owner_role: "clinical_lead", evidence_required: true, sla_days: 5, group: "Behavioral & Safety Escalation" },
        { name: "Chart vitals, medication, behavioral observations, incidents, and handover notes", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Documentation Quality" },
        { name: "Structured patient-by-patient handover, watch assignment pass, countersign requirements", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Shift Handover" },
        { name: "What nursing staff may explain vs escalate, boundary maintenance with families", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Family Communication" },
        { name: "Working with psychiatrist, psychologist, PSW, PCA, pharmacist, security", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Team Coordination" },
      ],
    },
    {
      stage: "role_induction",
      tasks: [
        { name: "Nursing KRA/KPI briefing", type: "training", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Performance" },
        { name: "Ward-specific SOP and shift handover protocol training", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 2, group: "Operations" },
        { name: "Patient safety, restraint, and seclusion protocols review", type: "training", owner_role: "clinical_lead", evidence_required: true, sla_days: 3, group: "Safety" },
        { name: "Review nursing handbook and SOP acknowledgement", type: "sign_off", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Compliance" },
      ],
    },
    {
      stage: "supervised_practice",
      tasks: [
        { name: "Days 1–3: Observe medication rounds, observation workflow, handover (close observation only)", type: "sign_off", owner_role: "buddy", evidence_required: true, sla_days: 3, group: "Observation Phase" },
        { name: "Days 4–7: Supervised documentation, medication support, observation charting", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 7, group: "Assisted Phase" },
        { name: "Week 2: Supervised patient assignments, medication rounds, watch duty", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 14, group: "Supervised Phase" },
        { name: "Week 3: Routine tasks with reduced prompting, independent documentation with review", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 21, group: "Reduced Prompting" },
        { name: "Week 4: Demonstrate readiness for routine independent duty", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 28, group: "Readiness Demonstration" },
      ],
    },
    {
      stage: "competency_signoff",
      tasks: [
        { name: "All 7 competencies signed off at Independent level", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 28, group: "Competency Review" },
        { name: "Supervisor overall assessment completed", type: "sign_off", owner_role: "department_head", evidence_required: true, sla_days: 28, group: "Competency Review" },
      ],
    },
    {
      stage: "deployment_clearance",
      tasks: [
        { name: "Final clearance decision — select clearance level", type: "sign_off", owner_role: "center_head", evidence_required: true, sla_days: 30, group: "Clearance" },
      ],
    },
  ],
  competencies: [
    { competency_name: "Safely administers routine medications and documents correctly", group_name: "Medication" },
    { competency_name: "Follows psychotropic medication precautions and omission escalation", group_name: "Medication" },
    { competency_name: "Completes observation and watch-duty checks on time", group_name: "Observation" },
    { competency_name: "Recognizes and escalates aggression, suicide risk, withdrawal deterioration, absconding", group_name: "Clinical Safety" },
    { competency_name: "Charts vitals, behavior, medications, and incidents in required format", group_name: "Documentation" },
    { competency_name: "Performs structured shift handover with countersign", group_name: "Operations" },
    { competency_name: "Communicates within nursing-family boundaries appropriately", group_name: "Communication" },
  ],
};

export const CLINICAL_PSYCHOLOGIST_FRAMEWORK: OnboardingFramework = {
  name: "Clinical Psychologist Onboarding - Mindful HR",
  role_family: "Clinical Psychologist",
  stage_blocks: [
    {
      stage: "preboarding",
      tasks: [
        { name: "Offer letter confirmed and signed", type: "document", owner_role: "hr", evidence_required: true, sla_days: 1, group: "Documentation" },
        { name: "RCI registration certificate collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "M.Phil / PhD certificate collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "ID and address proof collected", type: "document", owner_role: "hr", evidence_required: true, sla_days: 3, group: "Documentation" },
        { name: "Buddy assigned from psychology team", type: "checklist", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Preparation" },
        { name: "IT access planned", type: "access", owner_role: "it_admin", evidence_required: false, sla_days: 2, group: "Preparation" },
      ],
    },
    {
      stage: "day1_orientation",
      tasks: [
        { name: "Organisation and services introduction", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Organisation" },
        { name: "Code of conduct and ethics signed", type: "document", owner_role: "hr", evidence_required: true, sla_days: 1, group: "Compliance" },
        { name: "App and systems setup", type: "access", owner_role: "it_admin", evidence_required: true, sla_days: 1, group: "Systems" },
        { name: "Confidentiality and data protection briefing", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 1, group: "Ethics" },
      ],
    },
    {
      stage: "dept_induction",
      tasks: [
        { name: "Psychological assessment protocols training", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 5, group: "Assessment" },
        { name: "Therapy modalities used at Mindful HR overview", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Therapy" },
        { name: "Observe 3 therapy sessions", type: "training", owner_role: "buddy", evidence_required: true, sla_days: 7, group: "Therapy" },
        { name: "MDT workflow and psychologist's role", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "MDT Workflow" },
        { name: "Crisis intervention and safety protocols", type: "training", owner_role: "clinical_lead", evidence_required: true, sla_days: 5, group: "Safety" },
        { name: "Documentation and case notes standards", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 3, group: "Documentation" },
      ],
    },
    {
      stage: "role_induction",
      tasks: [
        { name: "Clinical Psychologist KRA/KPI briefing", type: "training", owner_role: "department_head", evidence_required: false, sla_days: 2, group: "Performance" },
        { name: "Caseload and session scheduling model", type: "training", owner_role: "clinical_lead", evidence_required: false, sla_days: 2, group: "Operations" },
        { name: "Ethical boundaries and dual relationships workshop", type: "training", owner_role: "clinical_lead", evidence_required: true, sla_days: 3, group: "Ethics" },
      ],
    },
    {
      stage: "supervised_practice",
      tasks: [
        { name: "Conduct 3 assessments under supervision", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 14, group: "Assessment" },
        { name: "Run 5 therapy sessions under supervision", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 21, group: "Therapy" },
        { name: "Complete 5 case documentation entries", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 14, group: "Documentation" },
        { name: "Manage independent caseload for 1 week", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 21, group: "Caseload" },
      ],
    },
    {
      stage: "competency_signoff",
      tasks: [
        { name: "All competencies signed off at Independent level", type: "sign_off", owner_role: "clinical_lead", evidence_required: true, sla_days: 28, group: "Competency Review" },
        { name: "Supervisor assessment completed", type: "sign_off", owner_role: "department_head", evidence_required: true, sla_days: 28, group: "Competency Review" },
      ],
    },
    {
      stage: "deployment_clearance",
      tasks: [
        { name: "Final clearance decision", type: "sign_off", owner_role: "center_head", evidence_required: true, sla_days: 30, group: "Clearance" },
      ],
    },
  ],
  competencies: [
    { competency_name: "Psychological assessment administration", group_name: "Assessment" },
    { competency_name: "Therapy session facilitation (CBT/DBT)", group_name: "Therapy" },
    { competency_name: "Crisis intervention response", group_name: "Safety" },
    { competency_name: "MDT participation and clinical input", group_name: "Teamwork" },
    { competency_name: "Case documentation and progress notes", group_name: "Documentation" },
    { competency_name: "Ethical boundaries and confidentiality", group_name: "Ethics" },
    { competency_name: "Psychoeducation delivery", group_name: "Education" },
    { competency_name: "Digital tools and app proficiency", group_name: "Systems" },
  ],
};

export const ALL_FRAMEWORKS: OnboardingFramework[] = [
  PSW_FRAMEWORK,
  STAFF_NURSE_FRAMEWORK,
  CLINICAL_PSYCHOLOGIST_FRAMEWORK,
];

export const CLEARANCE_LEVELS = [
  { value: "not_ready", label: "Not Ready for Patient-Facing Duty", color: "destructive" },
  { value: "supervised_only", label: "Supervised Duty Only", color: "secondary" },
  { value: "routine_independent", label: "Routine Independent Duty", color: "default" },
  { value: "restricted_independent", label: "Independent - High-Risk Restricted", color: "default" },
  { value: "fully_cleared", label: "Fully Cleared", color: "default" },
] as const;
