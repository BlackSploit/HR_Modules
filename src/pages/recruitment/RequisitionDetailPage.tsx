import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, CheckCircle, XCircle, Plus, ShieldCheck, Play, Search, UserPlus,
  ChevronRight, Zap, Clock, AlertTriangle, ShieldAlert, ChevronDown, Users,
  Calendar as CalendarIcon, FileText, Settings, Briefcase, ClipboardCheck,
  MessageSquare, Gift, UserCheck, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuickAddCandidateDialog from "@/components/recruitment/QuickAddCandidateDialog";
import ConvertToEmployeeDialog from "@/components/onboarding/ConvertToEmployeeDialog";

const sourcingChannels = [
  "direct", "referral", "employee_network",
  "naukri", "indeed", "shine", "monster", "other_job_portal",
  "linkedin", "facebook_ad", "instagram_ad", "whatsapp", "youtube_ad",
  "campus", "vendor",
  "walk_in", "boomerang", "past_applicant", "passive", "competitor", "outsourced_conversion",
  "pamphlets", "newspaper_ad", "notice_board", "posters",
];

const pipelineStages = [
  "new", "screening", "shortlisted", "interviewing", "selected", "offer", "joined", "rejected"
];

const professionCategories = [
  "Psychiatrist", "Clinical Psychologist", "Psychiatric Social Worker",
  "MPhil PSW / Programme Coordinator", "Staff Nurse", "Nursing Assistant",
  "Counsellor", "Occupational Therapist", "Lab Technician", "Pharmacist",
  "Admin / Front Desk", "Housekeeping / Support", "Driver", "Cook / Kitchen",
  "Security", "IT / Technical", "HR / Accounts", "Other",
];

const getFreshness = (createdAt: string) => {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 30) return { label: "New", className: "bg-green-100 text-green-700 border-green-200" };
  if (days <= 90) return { label: "Recent", className: "bg-blue-100 text-blue-700 border-blue-200" };
  if (days <= 180) return { label: "Old", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Stale", className: "bg-red-100 text-red-700 border-red-200" };
};

// --- Lifecycle Steps ---
const STEPS = [
  { key: "setup", label: "Setup", icon: Settings },
  { key: "approve", label: "Approve", icon: ClipboardCheck },
  { key: "source", label: "Source & Screen", icon: Users },
  { key: "interview", label: "Interview", icon: MessageSquare },
  { key: "offer", label: "Offer", icon: Gift },
  { key: "hired", label: "Hired", icon: UserCheck },
] as const;

type StepKey = typeof STEPS[number]["key"];

export default function RequisitionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // UI state
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [sourcingDialog, setSourcingDialog] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [autoScreening, setAutoScreening] = useState(false);
  const [autoScreenProgress, setAutoScreenProgress] = useState({ total: 0, done: 0, passed: 0 });
  const [sourcingForm, setSourcingForm] = useState({
    target_count: 1, sla_days: 30, target_join_date: "",
    channels: [] as string[],
  });
  const [overrideDialog, setOverrideDialog] = useState<{ runId: string; candidateId: string; linkId: string; currentStage: string; candidateName: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [interviewDialog, setInterviewDialog] = useState<{ candidateId: string; linkId: string; candidateName: string } | null>(null);
  const [interviewForm, setInterviewForm] = useState({ round_name: "Round 1", scheduled_at: "", notes: "" });
  const [offerDialog, setOfferDialog] = useState<{ candidateId: string; linkId: string; candidateName: string } | null>(null);
  const [offerForm, setOfferForm] = useState({ joining_date: "", notes: "" });
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [convertDialog, setConvertDialog] = useState<{ candidate: any; offer?: any } | null>(null);

  // --- Data queries ---
  const { data: requisition } = useQuery({
    queryKey: ["requisition", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_requisitions")
        .select("*, departments(name), designations(title), branches(name), programs(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["requisition_approvals", id],
    queryFn: async () => {
      const { data } = await supabase.from("requisition_approvals").select("*").eq("requisition_id", id!).order("sequence_number");
      return data || [];
    },
  });

  const { data: linkedCandidates = [] } = useQuery({
    queryKey: ["candidate_requisition_links", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_requisition_links")
        .select("*, candidates(first_name, last_name, status, email, phone, profession_category, sourcing_stage, created_at)")
        .eq("requisition_id", id!);
      return data || [];
    },
  });

  const { data: sourcingPlan } = useQuery({
    queryKey: ["sourcing_plan", id],
    queryFn: async () => {
      const { data } = await supabase.from("sourcing_plans").select("*").eq("requisition_id", id!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: screeningTemplates = [] } = useQuery({
    queryKey: ["screening_templates_all"],
    queryFn: async () => {
      const { data } = await supabase.from("screening_templates").select("id, name, job_family, status");
      return data || [];
    },
  });

  const { data: screeningRuns = [] } = useQuery({
    queryKey: ["screening_runs", id],
    queryFn: async () => {
      const { data } = await supabase.from("screening_runs").select("*, candidates(first_name, last_name)").eq("requisition_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: screeningResultItems = [] } = useQuery({
    queryKey: ["screening_result_items", id, screeningRuns.length],
    queryFn: async () => {
      const runIds = screeningRuns.map((r: any) => r.id);
      if (!runIds.length) return [];
      const { data } = await supabase.from("screening_result_items").select("*, screening_template_rules(label, field_name, rule_type)").in("run_id", runIds).eq("outcome", "fail");
      return data || [];
    },
    enabled: screeningRuns.length > 0,
  });

  const { data: screeningExceptions = [] } = useQuery({
    queryKey: ["screening_exceptions", id, screeningRuns.length],
    queryFn: async () => {
      const runIds = screeningRuns.map((r: any) => r.id);
      if (!runIds.length) return [];
      const { data } = await supabase.from("screening_exceptions").select("*").in("run_id", runIds);
      return data || [];
    },
    enabled: screeningRuns.length > 0,
  });

  const { data: interviewRounds = [] } = useQuery({
    queryKey: ["interview_rounds_req", id],
    queryFn: async () => {
      const { data } = await supabase.from("interview_rounds").select("*, candidates(first_name, last_name)").eq("requisition_id", id!).order("scheduled_at", { ascending: true });
      return data || [];
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["offers_req", id],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("*, candidates(first_name, last_name)").eq("requisition_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // --- Helpers ---
  const linkedCandidateIds = linkedCandidates.map((l: any) => l.candidate_id);
  const getFailedItems = (runId: string) => screeningResultItems.filter((item: any) => item.run_id === runId);
  const hasOverride = (runId: string) => screeningExceptions.some((ex: any) => ex.run_id === runId && ex.decision === "approved");
  const getScreeningRun = (candidateId: string) => screeningRuns.find((r: any) => r.candidate_id === candidateId);

  const candidatesByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage] = linkedCandidates.filter((l: any) => l.current_stage === stage);
    return acc;
  }, {} as Record<string, any[]>);

  const sortCandidates = (list: any[]) => {
    return [...list].sort((a, b) => {
      const runA = getScreeningRun(a.candidate_id);
      const runB = getScreeningRun(b.candidate_id);
      const scoreA = runA?.total_score ?? -1;
      const scoreB = runB?.total_score ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.candidates?.created_at || 0).getTime() - new Date(a.candidates?.created_at || 0).getTime();
    });
  };

  // Determine the current lifecycle step based on data
  const currentStep = useMemo((): StepKey => {
    if (!requisition) return "setup";
    const hasJoined = (candidatesByStage["joined"]?.length || 0) > 0;
    if (hasJoined) return "hired";
    const hasOffers = offers.length > 0 || (candidatesByStage["offer"]?.length || 0) > 0;
    if (hasOffers) return "offer";
    const hasInterviews = interviewRounds.length > 0 || (candidatesByStage["interviewing"]?.length || 0) > 0;
    if (hasInterviews) return "interview";
    const hasCandidates = linkedCandidates.length > 0;
    if (hasCandidates) return "source";
    if (["approved", "sourcing"].includes(requisition.status)) return "source";
    if (requisition.status === "pending_approval") return "approve";
    return "setup";
  }, [requisition, linkedCandidates, interviewRounds, offers, candidatesByStage]);

  const expandedStep = activeStep || currentStep;

  const isStepComplete = (key: StepKey): boolean => {
    if (!requisition) return false;
    const stepIdx = STEPS.findIndex(s => s.key === key);
    const currentIdx = STEPS.findIndex(s => s.key === currentStep);
    return stepIdx < currentIdx;
  };

  const getStepSummary = (key: StepKey): string => {
    if (!requisition) return "";
    switch (key) {
      case "setup": return requisition.title || "Position defined";
      case "approve": return approvals.length > 0 ? `${approvals.filter((a: any) => a.status === "approved").length} approved` : requisition.status === "approved" || requisition.status === "sourcing" ? "Approved" : "Pending";
      case "source": return `${linkedCandidates.length} candidates, ${screeningRuns.length} screened`;
      case "interview": return `${interviewRounds.length} interviews`;
      case "offer": return `${offers.length} offers`;
      case "hired": return `${candidatesByStage["joined"]?.length || 0} joined`;
    }
  };

  // --- Actions ---
  const updateStatus = async (status: string) => {
    await supabase.from("job_requisitions").update({
      status,
      ...(status === "approved" ? { approved_by: user!.id, approved_at: new Date().toISOString() } : {}),
    }).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["requisition", id] });
    toast({ title: `Status updated to ${status.replace("_", " ")}` });
  };

  const handleCreateSourcingPlan = async () => {
    await supabase.from("sourcing_plans").insert({
      requisition_id: id!, recruiter_id: user!.id,
      target_count: sourcingForm.target_count, sla_days: sourcingForm.sla_days,
      target_join_date: sourcingForm.target_join_date || null,
      channels: sourcingForm.channels, status: "active",
    } as any);
    setSourcingDialog(false);
    queryClient.invalidateQueries({ queryKey: ["sourcing_plan", id] });
    toast({ title: "Sourcing plan created" });
  };

  const attachScreeningTemplate = async (templateId: string) => {
    await supabase.from("job_requisitions").update({ screening_template_id: templateId } as any).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["requisition", id] });
    toast({ title: "Screening template attached" });
  };

  const detachScreeningTemplate = async () => {
    await supabase.from("job_requisitions").update({ screening_template_id: null } as any).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["requisition", id] });
    toast({ title: "Screening template removed" });
  };

  const runScreening = async (candidateId: string) => {
    const templateId = (requisition as any)?.screening_template_id;
    if (!templateId) { toast({ title: "Attach a screening template first", variant: "destructive" }); return; }
    try {
      const { data, error } = await supabase.functions.invoke("run-screening", {
        body: { candidate_id: candidateId, requisition_id: id, template_id: templateId },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["screening_runs", id] });
      toast({ title: `Screening complete: ${data.result_band.replace("_", " ")}`, description: `Score: ${data.total_score}%` });
      return data;
    } catch (e: any) {
      toast({ title: "Screening failed", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const linkCandidate = async (candidateId: string) => {
    const { error } = await supabase.from("candidate_requisition_links").insert({
      candidate_id: candidateId, requisition_id: id!, linked_by: user!.id, current_stage: "new",
    });
    if (error) { toast({ title: "Failed to link", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["candidate_requisition_links", id] });
    toast({ title: "Candidate linked" });
  };

  const updateLinkStage = async (e: React.MouseEvent, linkId: string, candidateId: string, newStage: string, oldStage: string) => {
    e.stopPropagation();
    if (newStage === oldStage) return;
    try {
      await supabase.from("candidate_requisition_links").update({ current_stage: newStage }).eq("id", linkId);
      await supabase.from("candidates").update({ sourcing_stage: newStage }).eq("id", candidateId);
      await supabase.from("candidate_stage_history").insert({
        candidate_id: candidateId, requisition_id: id!, from_stage: oldStage, to_stage: newStage, moved_by: user!.id,
      });
      queryClient.invalidateQueries({ queryKey: ["candidate_requisition_links", id] });
      toast({ title: `Stage updated to ${newStage.replace("_", " ")}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const overrideScreening = async () => {
    if (!overrideDialog || !overrideReason.trim()) return;
    try {
      if (overrideDialog.runId) {
        await supabase.from("screening_exceptions").insert({
          run_id: overrideDialog.runId, reason: overrideReason.trim(), requested_by: user!.id, decision: "approved",
        } as any);
      }
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
      await updateLinkStage(fakeEvent, overrideDialog.linkId, overrideDialog.candidateId, "shortlisted", overrideDialog.currentStage);
      queryClient.invalidateQueries({ queryKey: ["screening_exceptions", id] });
      toast({ title: "Override applied", description: `${overrideDialog.candidateName} moved to shortlisted` });
      setOverrideDialog(null);
      setOverrideReason("");
    } catch (err: any) {
      toast({ title: "Override failed", description: err.message, variant: "destructive" });
    }
  };

  const autoScreenDatabase = async () => {
    const templateId = (requisition as any)?.screening_template_id;
    if (!templateId) { toast({ title: "Attach a screening template first", variant: "destructive" }); return; }
    setAutoScreening(true);
    setAutoScreenProgress({ total: 0, done: 0, passed: 0 });
    try {
      const { data: matchingCandidates } = await supabase.from("candidates").select("id, first_name, last_name, profession_category, created_at").order("created_at", { ascending: false }).limit(100);
      const unlinked = (matchingCandidates || []).filter((c: any) => !linkedCandidateIds.includes(c.id));
      if (unlinked.length === 0) { toast({ title: "No unlinked candidates found" }); setAutoScreening(false); return; }
      setAutoScreenProgress({ total: unlinked.length, done: 0, passed: 0 });
      let passed = 0;
      for (let i = 0; i < unlinked.length; i++) {
        try {
          const { data, error } = await supabase.functions.invoke("run-screening", {
            body: { candidate_id: unlinked[i].id, requisition_id: id, template_id: templateId },
          });
          if (!error && data && (data.result_band === "auto_pass" || data.result_band === "recruiter_review")) {
            await supabase.from("candidate_requisition_links").insert({ candidate_id: unlinked[i].id, requisition_id: id!, linked_by: user!.id, current_stage: "screening" });
            passed++;
          }
        } catch {}
        setAutoScreenProgress({ total: unlinked.length, done: i + 1, passed });
      }
      queryClient.invalidateQueries({ queryKey: ["candidate_requisition_links", id] });
      queryClient.invalidateQueries({ queryKey: ["screening_runs", id] });
      toast({ title: "Database screening complete", description: `${passed} of ${unlinked.length} passed` });
    } catch (err: any) {
      toast({ title: "Auto-screening failed", description: err.message, variant: "destructive" });
    } finally { setAutoScreening(false); }
  };

  const scheduleInterview = async () => {
    if (!interviewDialog || !interviewForm.scheduled_at) return;
    try {
      await supabase.from("interview_rounds").insert({
        candidate_id: interviewDialog.candidateId,
        requisition_id: id!,
        round_name: interviewForm.round_name,
        round_number: 1,
        scheduled_at: interviewForm.scheduled_at,
        feedback_notes: interviewForm.notes || null,
        status: "scheduled",
      });
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
      await updateLinkStage(fakeEvent, interviewDialog.linkId, interviewDialog.candidateId, "interviewing", "shortlisted");
      queryClient.invalidateQueries({ queryKey: ["interview_rounds_req", id] });
      toast({ title: "Interview scheduled" });
      setInterviewDialog(null);
      setInterviewForm({ round_name: "Round 1", scheduled_at: "", notes: "" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const createOffer = async () => {
    if (!offerDialog) return;
    try {
      await supabase.from("offers").insert({
        candidate_id: offerDialog.candidateId,
        requisition_id: id!,
        joining_date: offerForm.joining_date || null,
        status: "draft",
        created_by: user!.id,
        department_id: requisition?.department_id || null,
        designation_id: requisition?.designation_id || null,
        branch_id: requisition?.branch_id || null,
      });
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
      await updateLinkStage(fakeEvent, offerDialog.linkId, offerDialog.candidateId, "offer", "selected");
      queryClient.invalidateQueries({ queryKey: ["offers_req", id] });
      toast({ title: "Offer created" });
      setOfferDialog(null);
      setOfferForm({ joining_date: "", notes: "" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const completeInterview = async (roundId: string) => {
    try {
      await supabase.from("interview_rounds").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", roundId);
      queryClient.invalidateQueries({ queryKey: ["interview_rounds_req", id] });
      toast({ title: "Interview marked as completed" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const autoCreateOnboardingCase = async (offerId: string, candidateId: string) => {
    // Fetch candidate, offer, and requisition details
    const [{ data: candidate }, { data: offer }] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", candidateId).single(),
      supabase.from("offers").select("*").eq("id", offerId).single(),
    ]);
    if (!candidate) throw new Error("Candidate not found");

    // 1. Create employee
    const empPayload: any = {
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      status: "onboarding" as any,
      date_of_joining: offer?.joining_date || null,
      branch_id: offer?.branch_id || requisition?.branch_id || null,
      department_id: offer?.department_id || requisition?.department_id || null,
      designation_id: offer?.designation_id || requisition?.designation_id || null,
    };
    const { data: employee, error: empErr } = await supabase.from("employees").insert(empPayload).select().single();
    if (empErr) throw empErr;

    // 2. Create onboarding case
    const casePayload: any = {
      employee_id: employee.id,
      candidate_id: candidate.id,
      offer_id: offerId,
      requisition_id: id,
      branch_id: empPayload.branch_id,
      department_id: empPayload.department_id,
      designation_id: empPayload.designation_id,
      role_family: candidate.profession_category || requisition?.category || null,
      joining_date: offer?.joining_date || null,
      onboarding_owner_id: user?.id,
      current_stage: "preboarding",
    };
    const { data: onboardingCase, error: caseErr } = await supabase.from("onboarding_cases").insert(casePayload).select().single();
    if (caseErr) throw caseErr;

    // 3. Auto-match template and generate tasks
    const { data: templates } = await supabase.from("onboarding_templates").select("*").eq("is_active", true);
    const roleFamily = (candidate.profession_category || "").toLowerCase();
    const matched = (templates || []).find((t: any) => t.role_family?.toLowerCase() === roleFamily);
    if (matched && matched.stage_blocks) {
      const blocks = matched.stage_blocks as any[];
      const taskInserts: any[] = [];
      blocks.forEach((block: any) => {
        (block.tasks || []).forEach((task: any) => {
          const dueDate = offer?.joining_date
            ? new Date(new Date(offer.joining_date).getTime() + (task.sla_days || 3) * 86400000).toISOString().split("T")[0]
            : null;
          taskInserts.push({
            case_id: onboardingCase.id,
            task_name: task.name,
            task_type: task.type || "checklist",
            stage: block.stage,
            owner_role: task.owner_role || "hr",
            due_date: dueDate,
            is_mandatory: true,
          });
        });
      });
      if (taskInserts.length > 0) {
        await supabase.from("onboarding_tasks").insert(taskInserts);
      }
    }

    // 4. Stage history
    await supabase.from("onboarding_stage_history").insert({
      case_id: onboardingCase.id,
      from_stage: "offer_accepted",
      to_stage: "preboarding",
      moved_by: user?.id,
      reason: "Auto-created on offer acceptance",
    });

    // 5. Update candidate status
    await supabase.from("candidates").update({ status: "hired" }).eq("id", candidate.id);

    return onboardingCase;
  };

  const updateOfferStatus = async (offerId: string, status: string, candidateId?: string, linkId?: string) => {
    try {
      const updateData: any = { status };
      if (status === "accepted") updateData.accepted_at = new Date().toISOString();
      await supabase.from("offers").update(updateData).eq("id", offerId);
      if (status === "accepted" && candidateId && linkId) {
        const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
        await updateLinkStage(fakeEvent, linkId, candidateId, "joined", "offer");
        // Auto-create onboarding case
        try {
          const onboardingCase = await autoCreateOnboardingCase(offerId, candidateId);
          toast({
            title: "Offer Accepted — Onboarding Started!",
            description: "Employee record created and onboarding case initiated.",
            action: (
              <Button variant="outline" size="sm" onClick={() => navigate(`/people/onboarding/${onboardingCase.id}`)}>
                View Onboarding
              </Button>
            ),
          });
        } catch (onbErr: any) {
          console.error("Onboarding auto-create failed:", onbErr);
          toast({ title: "Offer accepted but onboarding setup failed", description: onbErr.message, variant: "destructive" });
        }
      } else {
        toast({ title: `Offer ${status}` });
      }
      queryClient.invalidateQueries({ queryKey: ["offers_req", id] });
      queryClient.invalidateQueries({ queryKey: ["candidate_requisition_links", id] });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleChannel = (ch: string) => {
    setSourcingForm(prev => ({ ...prev, channels: prev.channels.includes(ch) ? prev.channels.filter(c => c !== ch) : [...prev.channels, ch] }));
  };

  // Search candidates for linking
  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["candidate_search_link", candidateSearch, categoryFilter],
    queryFn: async () => {
      let query = supabase.from("candidates").select("id, first_name, last_name, email, phone, profession_category, status, created_at").order("created_at", { ascending: false }).limit(30);
      if (categoryFilter) query = query.eq("profession_category", categoryFilter);
      if (candidateSearch.length >= 2) {
        const term = `%${candidateSearch}%`;
        query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
      }
      const { data } = await query;
      return (data || []).filter((c: any) => !linkedCandidateIds.includes(c.id));
    },
    enabled: linkDialog && (!!categoryFilter || candidateSearch.length >= 2),
  });

  // --- Smart next action ---
  const getNextAction = (l: any) => {
    const run = getScreeningRun(l.candidate_id);
    const isOverridden = run ? hasOverride(run.id) : false;
    const isPassed = run && (run.result_band === "auto_pass" || run.result_band === "recruiter_review" || run.result_band === "review");
    const screeningDone = isPassed || isOverridden;
    const stage = l.current_stage;
    if (stage === "rejected" || stage === "joined") return null;
    if (screeningDone && (stage === "new" || stage === "screening")) return { label: "→ Shortlist", nextStage: "shortlisted", type: "move" as const };
    if (stage === "shortlisted") return { label: "Schedule Interview", nextStage: "interviewing", type: "interview" as const };
    if (stage === "interviewing") return { label: "Mark Selected", nextStage: "selected", type: "move" as const };
    if (stage === "selected") return { label: "Create Offer", nextStage: "offer", type: "offer" as const };
    return null;
  };

  if (!requisition) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  // --- Candidate Row Renderer ---
  const renderCandidateRow = (l: any) => {
    const run = getScreeningRun(l.candidate_id);
    const freshness = l.candidates?.created_at ? getFreshness(l.candidates.created_at) : null;
    const failedItems = run ? getFailedItems(run.id) : [];
    const isOverridden = run ? hasOverride(run.id) : false;
    const isKnockoutOrReject = run && (run.knockout_failed || run.result_band === "reject");
    const screeningDone = isOverridden || (run && (run.result_band === "auto_pass" || run.result_band === "recruiter_review" || run.result_band === "review"));
    const nextAction = getNextAction(l);

    return (
      <div key={l.id} className="border rounded-lg hover:bg-muted/50 group">
        <div className="flex items-center gap-3 p-2.5">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/people/recruitment/candidates/${l.candidate_id}`)}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate group-hover:text-primary">{l.candidates?.first_name} {l.candidates?.last_name}</p>
              {freshness && <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${freshness.className}`}>{freshness.label}</span>}
              {isOverridden && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Override</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{l.candidates?.phone || l.candidates?.email || "—"} · {l.candidates?.profession_category || "—"}</p>
          </div>

          {run && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-16"><Progress value={run.total_score} className="h-1.5" /></div>
              <span className="text-xs font-semibold w-8">{run.total_score}%</span>
              <Badge variant={run.result_band === "auto_pass" ? "default" : run.result_band === "reject" ? "destructive" : "secondary"} className="capitalize text-[10px] px-1.5 py-0">{run.result_band?.replace("_", " ")}</Badge>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {nextAction && nextAction.type === "interview" ? (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setInterviewDialog({ candidateId: l.candidate_id, linkId: l.id, candidateName: `${l.candidates?.first_name} ${l.candidates?.last_name}` })}>
                <CalendarIcon className="h-3 w-3 mr-1" />{nextAction.label}
              </Button>
            ) : nextAction && nextAction.type === "offer" ? (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => setOfferDialog({ candidateId: l.candidate_id, linkId: l.id, candidateName: `${l.candidates?.first_name} ${l.candidates?.last_name}` })}>
                <Gift className="h-3 w-3 mr-1" />{nextAction.label}
              </Button>
            ) : nextAction ? (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-green-600 border-green-200 hover:bg-green-50"
                onClick={(e) => updateLinkStage(e, l.id, l.candidate_id, nextAction.nextStage, l.current_stage)}>
                <ChevronRight className="h-3 w-3 mr-1" />{nextAction.label}
              </Button>
            ) : null}

            {(requisition as any)?.screening_template_id && !run && !screeningDone && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => runScreening(l.candidate_id)}>
                <Play className="h-3 w-3 mr-1" />Screen
              </Button>
            )}

            {(isKnockoutOrReject || l.current_stage === "rejected") && !isOverridden && l.current_stage !== "shortlisted" && l.current_stage !== "joined" && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setOverrideDialog({ runId: run?.id || null, candidateId: l.candidate_id, linkId: l.id, currentStage: l.current_stage, candidateName: `${l.candidates?.first_name} ${l.candidates?.last_name}` })}>
                <ShieldAlert className="h-3 w-3 mr-1" />Override
              </Button>
            )}

            {l.current_stage !== "rejected" && l.current_stage !== "joined" && (
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                onClick={(e) => updateLinkStage(e, l.id, l.candidate_id, "rejected", l.current_stage)}>
                <XCircle className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div onClick={e => e.stopPropagation()} className="shrink-0">
            <Select value={l.current_stage} onValueChange={(val) => {
              const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
              updateLinkStage(fakeEvent, l.id, l.candidate_id, val, l.current_stage);
            }}>
              <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelineStages.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {run && failedItems.length > 0 && !isOverridden && (
          <div className="px-3 pb-2.5 pt-0">
            <div className="bg-destructive/5 border border-destructive/15 rounded-md p-2 space-y-1">
              <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide">Failed Rules</p>
              {failedItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-1.5 text-xs text-destructive/80">
                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{item.screening_template_rules?.label || item.screening_template_rules?.field_name || "Rule"}{item.notes && <span className="text-muted-foreground ml-1">— {item.notes}</span>}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER ---
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/recruitment/requisitions")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{requisition.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize">{requisition.status.replace("_"," ")}</Badge>
            <Badge variant={requisition.urgency === "critical" ? "destructive" : "secondary"} className="capitalize">{requisition.urgency}</Badge>
            <span className="text-xs text-muted-foreground">{requisition.departments?.name} · {requisition.branches?.name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {requisition.status === "draft" && <Button size="sm" onClick={() => updateStatus("pending_approval")}>Submit for Approval</Button>}
          {requisition.status === "pending_approval" && (
            <>
              <Button size="sm" onClick={() => updateStatus("approved")}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus("draft")}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
            </>
          )}
          {requisition.status === "approved" && <Button size="sm" onClick={() => updateStatus("sourcing")}>Start Sourcing</Button>}
        </div>
      </div>

      {/* ===== LIFECYCLE STEPPER ===== */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1.5 overflow-x-auto">
        {STEPS.map((step, idx) => {
          const complete = isStepComplete(step.key);
          const isCurrent = step.key === currentStep;
          const isExpanded = step.key === expandedStep;
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              onClick={() => setActiveStep(step.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
                ${isExpanded ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}
                ${complete ? "text-green-700" : ""}
              `}
            >
              {complete ? (
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center"><Check className="h-3 w-3 text-green-700" /></div>
              ) : (
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{idx + 1}</div>
              )}
              <span className="hidden sm:inline">{step.label}</span>
              {complete && <span className="text-[10px] text-muted-foreground hidden md:inline">· {getStepSummary(step.key)}</span>}
            </button>
          );
        })}
      </div>

      {/* ===== STEP CONTENT ===== */}

      {/* STEP 1: Setup */}
      {expandedStep === "setup" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Position Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{requisition.departments?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Designation</span><span>{requisition.designations?.title || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{requisition.branches?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Program</span><span>{requisition.programs?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Headcount</span><span>{requisition.headcount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{requisition.employment_type?.replace("_"," ")}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Requirements & Budget</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="capitalize">{requisition.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span>{requisition.preferred_experience_years ? `${requisition.preferred_experience_years} yrs` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span>{requisition.budget_min || requisition.budget_max ? `₹${requisition.budget_min || 0} - ₹${requisition.budget_max || 0}` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shift</span><span className="capitalize">{requisition.shift_pattern || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Target Join</span><span>{(requisition as any).target_join_date || "—"}</span></div>
              {requisition.justification && <div className="pt-2 border-t"><p className="text-muted-foreground mb-1">Justification</p><p>{requisition.justification}</p></div>}
            </CardContent>
          </Card>
          {(requisition.job_description || requisition.key_responsibilities) && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Job Description</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {requisition.job_description && <div><p className="text-muted-foreground text-xs mb-1">Description</p><p className="whitespace-pre-wrap">{requisition.job_description}</p></div>}
                {requisition.key_responsibilities && <div><p className="text-muted-foreground text-xs mb-1">Responsibilities</p><p className="whitespace-pre-wrap">{requisition.key_responsibilities}</p></div>}
                {requisition.required_qualifications && <div><p className="text-muted-foreground text-xs mb-1">Qualifications</p><p className="whitespace-pre-wrap">{requisition.required_qualifications}</p></div>}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 2: Approve */}
      {expandedStep === "approve" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Approvals</CardTitle></CardHeader>
          <CardContent>
            {["approved", "sourcing"].includes(requisition.status) ? (
              <Alert className="border-green-200 bg-green-50"><AlertDescription className="text-green-800 flex items-center gap-2"><CheckCircle className="h-4 w-4" />Requisition approved — ready to source candidates</AlertDescription></Alert>
            ) : requisition.status === "pending_approval" ? (
              <div className="space-y-3">
                <Alert className="border-amber-200 bg-amber-50"><AlertDescription className="text-amber-800">Awaiting approval</AlertDescription></Alert>
                <div className="flex gap-2">
                  <Button onClick={() => updateStatus("approved")}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                  <Button variant="outline" onClick={() => updateStatus("draft")}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Submit this requisition for approval</p>
                <Button onClick={() => updateStatus("pending_approval")}>Submit for Approval</Button>
              </div>
            )}
            {approvals.length > 0 && (
              <div className="mt-4 space-y-2">
                {approvals.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm">Approver #{a.sequence_number}</p>
                      {a.comments && <p className="text-xs text-muted-foreground">{a.comments}</p>}
                    </div>
                    <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Source & Screen */}
      {expandedStep === "source" && (
        <div className="space-y-4">
          {/* Screening template banner */}
          {!(requisition as any)?.screening_template_id ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm text-amber-800">No screening template — attach one to enable auto-screening</span>
                <Select onValueChange={attachScreeningTemplate}>
                  <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    {screeningTemplates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.job_family}) {t.status !== "active" ? `— ${t.status}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="flex items-center gap-2">
                <span className="text-sm text-green-800 font-medium">Screening: {screeningTemplates.find((t: any) => t.id === (requisition as any).screening_template_id)?.name || "Template"}</span>
                <Button variant="link" size="sm" className="text-green-700 h-auto p-0 text-xs" onClick={() => navigate(`/people/recruitment/screening-templates/${(requisition as any).screening_template_id}`)}>View →</Button>
                <Button variant="link" size="sm" className="text-destructive h-auto p-0 text-xs" onClick={detachScreeningTemplate}>Remove</Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Sourcing Plan */}
          {sourcingPlan ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Sourcing Plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Target</span><p className="font-semibold">{(sourcingPlan as any).target_count}</p></div>
                  <div><span className="text-muted-foreground">SLA</span><p className="font-semibold">{(sourcingPlan as any).sla_days} days</p></div>
                  <div><span className="text-muted-foreground">Join Date</span><p className="font-semibold">{(sourcingPlan as any).target_join_date || "—"}</p></div>
                </div>
                <div className="flex flex-wrap gap-1">{((sourcingPlan as any).channels || []).map((ch: string) => <Badge key={ch} variant="secondary" className="capitalize text-xs">{ch.replace("_", " ")}</Badge>)}</div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground mb-3">No sourcing plan yet</p><Button size="sm" onClick={() => setSourcingDialog(true)}><Plus className="h-4 w-4 mr-2" />Create Sourcing Plan</Button></CardContent></Card>
          )}

          {/* Auto-Screen */}
          {(requisition as any)?.screening_template_id && (
            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Auto-Screen Database</h3><p className="text-xs text-muted-foreground mt-1">Screen all unlinked candidates and auto-link those who pass</p></div>
                  <Button onClick={autoScreenDatabase} disabled={autoScreening} size="sm">{autoScreening ? "Screening..." : "Screen All"}</Button>
                </div>
                {autoScreening && (
                  <div className="mt-3 space-y-2">
                    <Progress value={autoScreenProgress.total > 0 ? (autoScreenProgress.done / autoScreenProgress.total) * 100 : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">Screened {autoScreenProgress.done} of {autoScreenProgress.total} · {autoScreenProgress.passed} passed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pipeline Progress + Candidates (merged) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Pipeline ({linkedCandidates.length} candidates)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setQuickAddOpen(true)}><Plus className="h-4 w-4 mr-1" />New Candidate</Button>
                <Button size="sm" onClick={() => { setLinkDialog(true); setCandidateSearch(""); setCategoryFilter(""); }}><UserPlus className="h-4 w-4 mr-1" />From Database</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stage counts bar */}
              <div className="flex gap-1 overflow-x-auto pb-3 mb-3">
                {selectedStage && (
                  <button onClick={() => setSelectedStage(null)} className="min-w-[60px] text-center p-2 rounded-lg border bg-muted/50 text-muted-foreground hover:bg-muted text-xs">
                    Show All
                  </button>
                )}
                {pipelineStages.map((stage) => {
                  const count = candidatesByStage[stage]?.length || 0;
                  const isActive = selectedStage === stage;
                  const stageColor = stage === "joined" || stage === "selected" ? "bg-green-100 text-green-700 border-green-200"
                    : stage === "rejected" ? "bg-red-100 text-red-700 border-red-200"
                    : stage === "shortlisted" || stage === "interviewing" ? "bg-blue-100 text-blue-700 border-blue-200"
                    : stage === "offer" ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-muted text-muted-foreground";
                  return (
                    <button key={stage} onClick={() => setSelectedStage(isActive ? null : stage)}
                      className={`flex-1 min-w-[75px] text-center p-2 rounded-lg border transition-all cursor-pointer
                        ${count > 0 ? stageColor : "bg-muted/50 text-muted-foreground"}
                        ${isActive ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-80"}
                      `}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] capitalize">{stage.replace("_", " ")}</p>
                    </button>
                  );
                })}
              </div>

              {/* Stage accordion */}
              {linkedCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No candidates linked yet — add from database or create new</p>
              ) : (
                <div className="space-y-1">
                  {pipelineStages.filter(s => (candidatesByStage[s]?.length || 0) > 0).filter(s => !selectedStage || s === selectedStage).map((stage) => {
                    const stageCands = candidatesByStage[stage] || [];
                    const stageIcon = stage === "shortlisted" ? "🟢" : stage === "interviewing" ? "🔵" : stage === "selected" ? "⭐" : stage === "offer" ? "💼" : stage === "joined" ? "✅" : stage === "rejected" ? "❌" : "⚪";
                    return (
                      <Collapsible key={stage} defaultOpen={stage !== "rejected"}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-muted/50 text-left group/stage">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{stageIcon}</span>
                            <span className="text-sm font-medium capitalize">{stage.replace("_", " ")}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stageCands.length}</Badge>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/stage:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-6 space-y-1.5 pb-2">
                            {sortCandidates(stageCands).map((l: any) => renderCandidateRow(l))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Screening Results */}
          {screeningRuns.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full p-2">
                <ChevronDown className="h-4 w-4" />
                Screening Results ({screeningRuns.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    {screeningRuns.map((run: any) => {
                      const failedItems = getFailedItems(run.id);
                      const isOverridden = hasOverride(run.id);
                      return (
                        <div key={run.id} className="p-2 border rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{run.candidates?.first_name} {run.candidates?.last_name}</p>
                              {isOverridden && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Overridden</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={run.total_score} className="w-16 h-1.5" />
                              <span className="text-xs font-bold">{run.total_score}%</span>
                              <Badge variant={run.result_band === "auto_pass" ? "default" : run.result_band === "reject" ? "destructive" : "secondary"} className="capitalize text-[10px]">{run.result_band?.replace("_", " ")}</Badge>
                            </div>
                          </div>
                          {failedItems.length > 0 && !isOverridden && (
                            <div className="bg-destructive/5 border border-destructive/15 rounded p-1.5 space-y-0.5">
                              {failedItems.map((item: any) => (
                                <div key={item.id} className="flex items-start gap-1 text-xs text-destructive/80">
                                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                  <span>{item.screening_template_rules?.label || "Rule"}{item.notes && <span className="text-muted-foreground ml-1">— {item.notes}</span>}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* STEP 4: Interview */}
      {expandedStep === "interview" && (
        <div className="space-y-4">
          {/* Scheduled / Completed Interview Rounds */}
          <Card>
            <CardHeader><CardTitle className="text-base">Interview Rounds ({interviewRounds.length})</CardTitle></CardHeader>
            <CardContent>
              {interviewRounds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No interviews scheduled yet. Shortlist candidates to schedule interviews.</p>
              ) : (
                <div className="space-y-2">
                  {interviewRounds.map((ir: any) => (
                    <div key={ir.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{ir.candidates?.first_name} {ir.candidates?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{ir.round_name} · {ir.scheduled_at ? new Date(ir.scheduled_at).toLocaleString() : "Not scheduled"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ir.status === "completed" ? "default" : "secondary"} className="capitalize">{ir.status}</Badge>
                        {ir.status === "scheduled" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => completeInterview(ir.id)}>
                            <Check className="h-3 w-3 mr-1" />Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shortlisted candidates ready for interview */}
          {(candidatesByStage["shortlisted"]?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Ready for Interview ({candidatesByStage["shortlisted"].length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {candidatesByStage["shortlisted"].map((l: any) => renderCandidateRow(l))}
              </CardContent>
            </Card>
          )}

          {/* Interviewing candidates — ready to be marked selected */}
          {(candidatesByStage["interviewing"]?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Interviewing — Ready to Progress ({candidatesByStage["interviewing"].length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {candidatesByStage["interviewing"].map((l: any) => renderCandidateRow(l))}
              </CardContent>
            </Card>
          )}

          {/* Selected candidates — ready for offer */}
          {(candidatesByStage["selected"]?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Selected — Create Offer ({candidatesByStage["selected"].length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {candidatesByStage["selected"].map((l: any) => renderCandidateRow(l))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 5: Offer */}
      {expandedStep === "offer" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Offers ({offers.length})</CardTitle></CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No offers created yet. Select candidates after interviews.</p>
              ) : (
                <div className="space-y-2">
                  {offers.map((o: any) => {
                    const link = linkedCandidates.find((l: any) => l.candidate_id === o.candidate_id);
                    return (
                      <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{o.candidates?.first_name} {o.candidates?.last_name}</p>
                          <p className="text-xs text-muted-foreground">Joining: {o.joining_date || "TBD"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={o.status === "accepted" ? "default" : o.status === "declined" ? "destructive" : "secondary"} className="capitalize">{o.status}</Badge>
                          {(o.status === "draft" || o.status === "sent") && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => updateOfferStatus(o.id, "accepted", o.candidate_id, link?.id)}>
                                <Check className="h-3 w-3 mr-1" />Accepted
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateOfferStatus(o.id, "declined")}>
                                <XCircle className="h-3 w-3 mr-1" />Declined
                              </Button>
                            </>
                          )}
                          {o.status === "accepted" && link && link.current_stage !== "joined" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={(e) => updateLinkStage(e, link.id, o.candidate_id, "joined", link.current_stage)}>
                              <UserCheck className="h-3 w-3 mr-1" />Mark Joined
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {(candidatesByStage["selected"]?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Selected — Ready for Offer ({candidatesByStage["selected"].length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {candidatesByStage["selected"].map((l: any) => renderCandidateRow(l))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 6: Hired */}
      {expandedStep === "hired" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Hired ({candidatesByStage["joined"]?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {(candidatesByStage["joined"]?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No candidates have joined yet.</p>
            ) : (
              <div className="space-y-2">
                {candidatesByStage["joined"].map((l: any) => {
                  const offer = offers.find((o: any) => o.candidate_id === l.candidate_id);
                  return (
                    <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{l.candidates?.first_name} {l.candidates?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{l.candidates?.profession_category || "—"}</p>
                      </div>
                      <Button size="sm" onClick={() => setConvertDialog({ candidate: l.candidates, offer })}>
                        <UserPlus className="h-3 w-3 mr-1" />Convert to Employee
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== DIALOGS ===== */}

      {/* Sourcing Plan Dialog */}
      <Dialog open={sourcingDialog} onOpenChange={setSourcingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Sourcing Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target Profiles</Label><Input type="number" min={1} value={sourcingForm.target_count} onChange={(e) => setSourcingForm({ ...sourcingForm, target_count: parseInt(e.target.value) || 1 })} /></div>
              <div><Label>SLA (days)</Label><Input type="number" min={1} value={sourcingForm.sla_days} onChange={(e) => setSourcingForm({ ...sourcingForm, sla_days: parseInt(e.target.value) || 30 })} /></div>
            </div>
            <div><Label>Target Join Date</Label><Input type="date" value={sourcingForm.target_join_date} onChange={(e) => setSourcingForm({ ...sourcingForm, target_join_date: e.target.value })} /></div>
            <div>
              <Label>Sourcing Channels</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {sourcingChannels.map(ch => (
                  <div key={ch} className="flex items-center gap-2"><Checkbox checked={sourcingForm.channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} /><span className="text-sm capitalize">{ch.replace("_", " ")}</span></div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSourcingDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateSourcingPlan}>Create Plan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Candidate Dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Candidate from Database</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {professionCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, phone, email..." className="pl-9" value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} />
            </div>
            {!categoryFilter && candidateSearch.length < 2 && <p className="text-sm text-muted-foreground text-center py-4">Select a category or type 2+ chars</p>}
            {(categoryFilter || candidateSearch.length >= 2) && isSearching && <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>}
            {(categoryFilter || candidateSearch.length >= 2) && !isSearching && searchResults.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No results</p>}
            {searchResults.length > 0 && (
              <div className="max-h-[350px] overflow-y-auto space-y-1.5">
                {searchResults.map((c: any) => {
                  const freshness = getFreshness(c.created_at);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                          <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium shrink-0 ${freshness.className}`}>{freshness.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || "—"} · {c.profession_category || "—"}</p>
                      </div>
                      <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => linkCandidate(c.id)}><Plus className="h-3 w-3 mr-1" />Link</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={!!overrideDialog} onOpenChange={(open) => { if (!open) { setOverrideDialog(null); setOverrideReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />Override Screening</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50"><AlertDescription className="text-sm text-amber-800">Overriding screening for <strong>{overrideDialog?.candidateName}</strong>. This moves them to shortlisted.</AlertDescription></Alert>
            <div><Label>Reason (required)</Label><Textarea placeholder="e.g., Equivalent experience..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="min-h-[80px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOverrideDialog(null); setOverrideReason(""); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={!overrideReason.trim()} onClick={overrideScreening}><ShieldAlert className="h-4 w-4 mr-2" />Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={!!interviewDialog} onOpenChange={(open) => { if (!open) setInterviewDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Interview — {interviewDialog?.candidateName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Round Name</Label><Input value={interviewForm.round_name} onChange={(e) => setInterviewForm({ ...interviewForm, round_name: e.target.value })} /></div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={interviewForm.scheduled_at} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })} /></div>
            <div><Label>Notes (optional)</Label><Textarea value={interviewForm.notes} onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialog(null)}>Cancel</Button>
            <Button disabled={!interviewForm.scheduled_at} onClick={scheduleInterview}><CalendarIcon className="h-4 w-4 mr-2" />Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Offer Dialog */}
      <Dialog open={!!offerDialog} onOpenChange={(open) => { if (!open) setOfferDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Offer — {offerDialog?.candidateName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Joining Date</Label><Input type="date" value={offerForm.joining_date} onChange={(e) => setOfferForm({ ...offerForm, joining_date: e.target.value })} /></div>
            <div><Label>Notes (optional)</Label><Textarea value={offerForm.notes} onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialog(null)}>Cancel</Button>
            <Button onClick={createOffer}><Gift className="h-4 w-4 mr-2" />Create Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Candidate Dialog */}
      <QuickAddCandidateDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        requisitionId={id!}
        onCandidateAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["candidate_requisition_links", id] });
        }}
      />

      {/* Convert to Employee Dialog */}
      {convertDialog && (
        <ConvertToEmployeeDialog
          open={!!convertDialog}
          onOpenChange={(open) => !open && setConvertDialog(null)}
          candidate={convertDialog.candidate}
          offer={convertDialog.offer}
          requisition={requisition}
        />
      )}
    </div>
  );
}
