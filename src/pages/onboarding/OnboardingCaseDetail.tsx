import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, CheckCircle, Clock, Upload, AlertTriangle,
  ChevronRight, FileText, ShieldCheck, GraduationCap, Key, ClipboardCheck,
  MoreVertical, Plus, Ban, MessageSquare, UserPlus, Link as LinkIcon, Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CLEARANCE_LEVELS } from "@/data/onboarding-frameworks";

const STAGES = [
  { key: "preboarding", label: "Pre-boarding", icon: ClipboardCheck },
  { key: "day1_orientation", label: "Day 1", icon: GraduationCap },
  { key: "dept_induction", label: "Dept Induction", icon: GraduationCap },
  { key: "role_induction", label: "Role Induction", icon: ShieldCheck },
  { key: "supervised_practice", label: "Supervised Practice", icon: Clock },
  { key: "competency_signoff", label: "Competency", icon: CheckCircle },
  { key: "deployment_clearance", label: "Clearance", icon: Key },
];

const STAGE_ORDER = ["offer_accepted", "preboarding", "joining_review", "day1_orientation", "dept_induction", "role_induction", "supervised_practice", "competency_signoff", "deployment_clearance", "integration_30_60_90", "completed"];

const TASK_TYPE_ICONS: Record<string, any> = {
  document: FileText,
  training: GraduationCap,
  checklist: ClipboardCheck,
  sign_off: ShieldCheck,
  access: Key,
};

const OWNER_ROLES = ["hr", "manager", "trainer", "it", "admin", "buddy", "employee"];
const TASK_TYPES = ["checklist", "document", "training", "sign_off", "access"];

export default function OnboardingCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [progressDialog, setProgressDialog] = useState(false);
  const [progressReason, setProgressReason] = useState("");
  const [selectedClearance, setSelectedClearance] = useState("");

  // Add task state
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ task_name: "", task_type: "checklist", owner_role: "hr", due_date: "", is_mandatory: true });

  // Block/note dialog state
  const [actionDialog, setActionDialog] = useState<{ taskId: string; action: "block" | "waive" | "note"; currentNotes: string } | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // Document upload
  const [uploading, setUploading] = useState(false);

  // Buddy assignment
  const [buddyDialog, setBuddyDialog] = useState(false);
  const [selectedBuddyId, setSelectedBuddyId] = useState("");

  // Competency view
  const [showCompetencies, setShowCompetencies] = useState(false);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["onboarding_case", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_cases")
        .select("*, employees!onboarding_cases_employee_id_fkey(first_name, last_name, email, phone), branches(name), departments(name), designations(title)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["onboarding_tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .select("*")
        .eq("case_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["onboarding_documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_documents")
        .select("*")
        .eq("case_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: stageHistory = [] } = useQuery({
    queryKey: ["onboarding_stage_history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_stage_history")
        .select("*")
        .eq("case_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: competencies = [], refetch: refetchCompetencies } = useQuery({
    queryKey: ["onboarding_competencies", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_competencies")
        .select("*")
        .eq("case_id", id!)
        .order("group_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Buddy employee data
  const { data: buddyEmployee } = useQuery({
    queryKey: ["buddy_employee", caseData?.buddy_id],
    queryFn: async () => {
      if (!caseData?.buddy_id) return null;
      const { data } = await supabase.from("employees").select("id, first_name, last_name").eq("id", caseData.buddy_id).single();
      return data;
    },
    enabled: !!caseData?.buddy_id,
  });

  // Employees for buddy selection
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees_for_buddy"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, first_name, last_name").in("status", ["active", "probation"]).order("first_name");
      return data || [];
    },
    enabled: buddyDialog,
  });

  const currentStageIndex = caseData ? STAGE_ORDER.indexOf(caseData.current_stage) : 0;
  const displayStage = activeStage || caseData?.current_stage || "preboarding";

  const stageTasks = useMemo(() => tasks.filter((t: any) => t.stage === displayStage), [tasks, displayStage]);

  // Group stage tasks by group label
  const groupedStageTasks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const ungrouped: any[] = [];
    stageTasks.forEach((t: any) => {
      const groupLabel = t.group || null;
      if (groupLabel) {
        if (!groups[groupLabel]) groups[groupLabel] = [];
        groups[groupLabel].push(t);
      } else {
        ungrouped.push(t);
      }
    });
    return { groups, ungrouped };
  }, [stageTasks]);

  const readiness = useMemo(() => {
    const mandatory = tasks.filter((t: any) => t.is_mandatory);
    const completed = mandatory.filter((t: any) => t.status === "completed" || t.status === "waived");
    return mandatory.length > 0 ? Math.round((completed.length / mandatory.length) * 100) : 0;
  }, [tasks]);

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const updateData: any = { status: newStatus };
    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user?.id;
    } else {
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    const { error } = await supabase.from("onboarding_tasks").update(updateData).eq("id", taskId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const updatedTasks = tasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t);
    const mandatory = updatedTasks.filter((t: any) => t.is_mandatory);
    const completedCount = mandatory.filter((t: any) => t.status === "completed" || t.status === "waived").length;
    const newReadiness = mandatory.length > 0 ? Math.round((completedCount / mandatory.length) * 100) : 0;

    await supabase.from("onboarding_cases").update({ readiness_score: newReadiness }).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["onboarding_tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding_case", id] });
  };

  const handleTaskAction = async () => {
    if (!actionDialog) return;
    const { taskId, action } = actionDialog;

    if (action === "block") {
      await supabase.from("onboarding_tasks").update({ status: "blocked", notes: actionNotes || null }).eq("id", taskId);
    } else if (action === "waive") {
      await supabase.from("onboarding_tasks").update({ status: "waived", notes: actionNotes || null }).eq("id", taskId);
    } else if (action === "note") {
      await supabase.from("onboarding_tasks").update({ notes: actionNotes || null }).eq("id", taskId);
    }

    const updatedTasks = tasks.map((t: any) => {
      if (t.id === taskId) {
        if (action === "block") return { ...t, status: "blocked" };
        if (action === "waive") return { ...t, status: "waived" };
      }
      return t;
    });
    const mandatory = updatedTasks.filter((t: any) => t.is_mandatory);
    const completedCount = mandatory.filter((t: any) => t.status === "completed" || t.status === "waived").length;
    const newReadiness = mandatory.length > 0 ? Math.round((completedCount / mandatory.length) * 100) : 0;
    await supabase.from("onboarding_cases").update({ readiness_score: newReadiness }).eq("id", id!);

    setActionDialog(null);
    setActionNotes("");
    queryClient.invalidateQueries({ queryKey: ["onboarding_tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding_case", id] });
    toast({ title: action === "block" ? "Task blocked" : action === "waive" ? "Task waived" : "Note saved" });
  };

  const addTask = async () => {
    if (!newTask.task_name.trim()) return;
    const { error } = await supabase.from("onboarding_tasks").insert({
      case_id: id!,
      stage: displayStage as any,
      task_name: newTask.task_name,
      task_type: newTask.task_type as any,
      owner_role: newTask.owner_role as any,
      due_date: newTask.due_date || null,
      is_mandatory: newTask.is_mandatory,
      status: "pending",
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setAddTaskOpen(false);
    setNewTask({ task_name: "", task_type: "checklist", owner_role: "hr", due_date: "", is_mandatory: true });
    queryClient.invalidateQueries({ queryKey: ["onboarding_tasks", id] });
    toast({ title: "Task added" });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;
    setUploading(true);

    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("onboarding-documents").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    await supabase.from("onboarding_documents").insert({
      case_id: id!,
      doc_type: file.name.split(".").pop() || "other",
      file_url: filePath,
      upload_by: "hr",
      is_mandatory: false,
      verification_status: "pending",
    } as any);

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["onboarding_documents", id] });
    toast({ title: "Document uploaded" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const assignBuddy = async () => {
    if (!selectedBuddyId) return;
    await supabase.from("onboarding_cases").update({ buddy_id: selectedBuddyId } as any).eq("id", id!);
    setBuddyDialog(false);
    setSelectedBuddyId("");
    queryClient.invalidateQueries({ queryKey: ["onboarding_case", id] });
    queryClient.invalidateQueries({ queryKey: ["buddy_employee", selectedBuddyId] });
    toast({ title: "Buddy assigned" });
  };

  const updateCompetencyLevel = async (compId: string, level: "observed" | "supervised" | "independent", currentVal: boolean) => {
    const updateData: any = { [level]: !currentVal };
    if (!currentVal) {
      updateData[`${level}_at`] = new Date().toISOString();
      updateData[`${level}_by`] = user?.id;
    } else {
      updateData[`${level}_at`] = null;
      updateData[`${level}_by`] = null;
    }
    await supabase.from("onboarding_competencies").update(updateData).eq("id", compId);
    refetchCompetencies();
  };

  const updateCompetencyNotes = async (compId: string, notes: string) => {
    await supabase.from("onboarding_competencies").update({ reviewer_notes: notes }).eq("id", compId);
    refetchCompetencies();
  };

  const isClearanceStage = caseData?.current_stage === "competency_signoff" || caseData?.current_stage === "deployment_clearance";

  const progressStage = async () => {
    if (!caseData) return;
    const nextIndex = currentStageIndex + 1;
    if (nextIndex >= STAGE_ORDER.length) return;

    const nextStage = STAGE_ORDER[nextIndex];

    // If moving to deployment_clearance, require clearance selection
    if (nextStage === "deployment_clearance" || nextStage === "completed") {
      if (isClearanceStage && selectedClearance) {
        await supabase.from("onboarding_cases").update({ clearance_status: selectedClearance } as any).eq("id", id!);
      }
    }

    await supabase.from("onboarding_stage_history").insert({
      case_id: id!,
      from_stage: caseData.current_stage as any,
      to_stage: nextStage as any,
      moved_by: user?.id,
      reason: progressReason || (selectedClearance ? `Clearance: ${selectedClearance}` : null),
    } as any);

    await supabase.from("onboarding_cases").update({ current_stage: nextStage as any }).eq("id", id!);

    if (nextStage === "completed") {
      await supabase.from("employees").update({ status: "probation" }).eq("id", caseData.employee_id);
    }

    setProgressDialog(false);
    setProgressReason("");
    setSelectedClearance("");
    setActiveStage(nextStage);
    queryClient.invalidateQueries({ queryKey: ["onboarding_case", id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding_stage_history", id] });
    toast({ title: "Stage progressed", description: `Moved to ${nextStage.replace(/_/g, " ")}` });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (!caseData) return <div className="flex items-center justify-center py-20 text-muted-foreground">Case not found</div>;

  const currentStageTasks = tasks.filter((t: any) => t.stage === caseData.current_stage && t.is_mandatory);
  const currentStageComplete = currentStageTasks.length === 0 || currentStageTasks.every((t: any) => t.status === "completed" || t.status === "waived");

  // Competency grouping
  const competencyGroups: Record<string, any[]> = {};
  competencies.forEach((c: any) => {
    const g = c.group_name || "General";
    if (!competencyGroups[g]) competencyGroups[g] = [];
    competencyGroups[g].push(c);
  });

  const competencyProgress = competencies.length > 0
    ? Math.round(competencies.filter((c: any) => c.independent).length / competencies.length * 100)
    : 0;

  const renderTaskItem = (task: any) => {
    const Icon = TASK_TYPE_ICONS[task.task_type] || ClipboardCheck;
    const isComplete = task.status === "completed";
    const isBlocked = task.status === "blocked";
    const isWaived = task.status === "waived";
    return (
      <div
        key={task.id}
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors
          ${isComplete ? "bg-green-50/50 border-green-200" : ""}
          ${isBlocked ? "bg-destructive/5 border-destructive/20" : ""}
          ${isWaived ? "bg-muted border-muted" : ""}
        `}
      >
        <Checkbox
          checked={isComplete}
          disabled={isWaived}
          onCheckedChange={() => toggleTask(task.id, task.status)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}>
              {task.task_name}
            </span>
            {task.is_mandatory && <Badge variant="outline" className="text-[10px] h-4">Required</Badge>}
            {task.evidence_required && <Badge variant="secondary" className="text-[10px] h-4">📎 Evidence</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {task.owner_role && <span className="capitalize">{task.owner_role.replace(/_/g, " ")}</span>}
            {task.due_date && <span>Due: {task.due_date}</span>}
            {isBlocked && <Badge variant="destructive" className="text-[10px] h-4">Blocked</Badge>}
            {isWaived && <Badge variant="secondary" className="text-[10px] h-4">Waived</Badge>}
          </div>
          {task.notes && <p className="text-xs text-muted-foreground mt-1 italic">{task.notes}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isBlocked && !isWaived && (
              <DropdownMenuItem onClick={() => { setActionDialog({ taskId: task.id, action: "block", currentNotes: task.notes || "" }); setActionNotes(""); }}>
                <Ban className="h-3.5 w-3.5 mr-2" />Mark Blocked
              </DropdownMenuItem>
            )}
            {!isWaived && (
              <DropdownMenuItem onClick={() => { setActionDialog({ taskId: task.id, action: "waive", currentNotes: task.notes || "" }); setActionNotes(""); }}>
                <ShieldCheck className="h-3.5 w-3.5 mr-2" />Waive Task
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { setActionDialog({ taskId: task.id, action: "note", currentNotes: task.notes || "" }); setActionNotes(task.notes || ""); }}>
              <MessageSquare className="h-3.5 w-3.5 mr-2" />Add Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/onboarding")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{caseData.employees?.first_name} {caseData.employees?.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            {caseData.designations?.title || caseData.role_family || "—"} · {caseData.branches?.name || "—"} · Joining: {caseData.joining_date || "TBD"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                  strokeDasharray={`${readiness} ${100 - readiness}`} strokeLinecap="round" />
              </svg>
              <span className="absolute text-xs font-bold">{readiness}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Readiness</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STAGES.map((stage) => {
              const stageIdx = STAGE_ORDER.indexOf(stage.key);
              const isCurrent = caseData.current_stage === stage.key;
              const isPast = stageIdx < currentStageIndex;
              const isViewing = displayStage === stage.key;

              return (
                <button
                  key={stage.key}
                  onClick={() => setActiveStage(stage.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap border
                    ${isViewing ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border"}
                    ${isPast ? "bg-green-50 text-green-700 border-green-200" : ""}
                    ${isCurrent && !isViewing ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                  `}
                >
                  {isPast ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <stage.icon className="h-3.5 w-3.5" />}
                  {stage.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Checklist — Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base capitalize">{displayStage.replace(/_/g, " ")} Tasks</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stageTasks.filter((t: any) => t.status === "completed").length}/{stageTasks.length} done</Badge>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddTaskOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />Add Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stageTasks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No tasks defined for this stage</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setAddTaskOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />Add the first task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Render grouped tasks */}
                  {Object.entries(groupedStageTasks.groups).map(([groupName, grpTasks]) => (
                    <div key={groupName} className="space-y-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide border-b border-primary/20 pb-1">{groupName}</p>
                      {grpTasks.map(renderTaskItem)}
                    </div>
                  ))}
                  {/* Render ungrouped tasks */}
                  {groupedStageTasks.ungrouped.length > 0 && (
                    <div className="space-y-2">
                      {Object.keys(groupedStageTasks.groups).length > 0 && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">Other</p>
                      )}
                      {groupedStageTasks.ungrouped.map(renderTaskItem)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency Sign-Off Matrix */}
          {(displayStage === "competency_signoff" || displayStage === "supervised_practice" || showCompetencies) && competencies.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Competency Sign-Off
                  </CardTitle>
                  <Badge variant="outline">{competencyProgress}% at Independent</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(competencyGroups).map(([group, comps]) => (
                    <div key={group} className="space-y-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{group}</p>
                      {comps.map((comp: any) => (
                        <div key={comp.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{comp.competency_name}</p>
                            <div className="flex items-center gap-1">
                              {comp.independent && <Badge className="text-[10px] h-4 bg-green-600">Independent</Badge>}
                              {!comp.independent && comp.supervised && <Badge variant="secondary" className="text-[10px] h-4">Supervised</Badge>}
                              {!comp.independent && !comp.supervised && comp.observed && <Badge variant="outline" className="text-[10px] h-4">Observed</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox
                                checked={comp.observed}
                                onCheckedChange={() => updateCompetencyLevel(comp.id, "observed", comp.observed)}
                              />
                              <span className={comp.observed ? "text-foreground font-medium" : "text-muted-foreground"}>Observed</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox
                                checked={comp.supervised}
                                disabled={!comp.observed}
                                onCheckedChange={() => updateCompetencyLevel(comp.id, "supervised", comp.supervised)}
                              />
                              <span className={comp.supervised ? "text-foreground font-medium" : "text-muted-foreground"}>Supervised</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox
                                checked={comp.independent}
                                disabled={!comp.supervised}
                                onCheckedChange={() => updateCompetencyLevel(comp.id, "independent", comp.independent)}
                              />
                              <span className={comp.independent ? "text-green-700 font-medium" : "text-muted-foreground"}>Independent</span>
                            </label>
                          </div>
                          {comp.reviewer_notes && (
                            <p className="text-xs text-muted-foreground italic">{comp.reviewer_notes}</p>
                          )}
                          <Input
                            placeholder="Reviewer notes..."
                            className="text-xs h-7"
                            defaultValue={comp.reviewer_notes || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (comp.reviewer_notes || "")) {
                                updateCompetencyNotes(comp.id, e.target.value);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Documents</CardTitle>
                <div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleDocUpload} />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3 w-3 mr-1" />{uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No documents yet. Upload one to get started.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium capitalize">{doc.doc_type.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.is_mandatory ? "Mandatory" : "Optional"} · Upload by: {doc.upload_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          doc.verification_status === "verified" ? "default" :
                          doc.verification_status === "rejected" ? "destructive" : "secondary"
                        } className="capitalize text-xs">
                          {doc.verification_status}
                        </Badge>
                        {doc.file_url && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                            // Extract path from stored value (handles both raw paths and old public URLs)
                            let path = doc.file_url;
                            if (path.includes("/object/public/onboarding-documents/")) {
                              path = path.split("/object/public/onboarding-documents/")[1];
                            }
                            const { data } = await supabase.storage
                              .from("onboarding-documents")
                              .createSignedUrl(path, 3600);
                            if (data?.signedUrl) {
                              window.open(data.signedUrl, "_blank");
                            } else {
                              toast({ title: "Failed to open document", variant: "destructive" });
                            }
                          }}>View</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Progress Action */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Stage Progression</h3>
              {caseData.current_stage === "completed" ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Onboarding Complete</span>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    {currentStageComplete
                      ? "All mandatory tasks complete. Ready to progress."
                      : `${currentStageTasks.filter((t: any) => t.status !== "completed" && t.status !== "waived").length} mandatory tasks remaining`
                    }
                  </div>
                  <Button
                    className="w-full"
                    disabled={!currentStageComplete}
                    onClick={() => setProgressDialog(true)}
                  >
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Progress to Next Stage
                  </Button>
                </>
              )}

              {/* Clearance status display */}
              {caseData.clearance_status && (
                <div className="mt-2 p-2 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Clearance Level</p>
                  <p className="text-sm font-medium capitalize">{caseData.clearance_status.replace(/_/g, " ")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency Quick View */}
          {competencies.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" />Competencies
                  </h3>
                  <Badge variant="outline" className="text-[10px]">{competencyProgress}%</Badge>
                </div>
                <Progress value={competencyProgress} className="h-2" />
                <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                  <div className="p-1 rounded bg-muted/50">
                    <span className="font-bold">{competencies.filter((c: any) => c.observed).length}</span>
                    <p className="text-muted-foreground">Observed</p>
                  </div>
                  <div className="p-1 rounded bg-muted/50">
                    <span className="font-bold">{competencies.filter((c: any) => c.supervised).length}</span>
                    <p className="text-muted-foreground">Supervised</p>
                  </div>
                  <div className="p-1 rounded bg-green-50">
                    <span className="font-bold text-green-700">{competencies.filter((c: any) => c.independent).length}</span>
                    <p className="text-muted-foreground">Independent</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => { setShowCompetencies(true); setActiveStage("competency_signoff"); }}>
                  View Full Matrix
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Buddy */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Buddy</CardTitle></CardHeader>
            <CardContent>
              {buddyEmployee ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{buddyEmployee.first_name} {buddyEmployee.last_name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBuddyDialog(true)}>Change</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setBuddyDialog(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />Assign Buddy
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Case Info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Case Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role Family</span>
                <span className="font-medium">{caseData.role_family || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{caseData.departments?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Center</span>
                <span className="font-medium">{caseData.branches?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-xs">{caseData.employees?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{caseData.employees?.phone || "—"}</span>
              </div>
              {caseData.current_stage !== "completed" && (
                <Button size="sm" variant="ghost" className="w-full text-xs mt-2" onClick={() => navigate(`/growth/probation`)}>
                  <LinkIcon className="h-3 w-3 mr-1" />View Probation Tracker
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Stage History */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Stage History</CardTitle></CardHeader>
            <CardContent>
              {stageHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No stage transitions yet</p>
              ) : (
                <div className="space-y-2">
                  {stageHistory.slice(0, 5).map((h: any) => (
                    <div key={h.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                      <p className="font-medium capitalize">{h.to_stage.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                      {h.reason && <p className="text-muted-foreground italic">{h.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress Dialog with Clearance Selection */}
      <Dialog open={progressDialog} onOpenChange={setProgressDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Progress to Next Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Moving from <strong className="capitalize">{caseData.current_stage.replace(/_/g, " ")}</strong> to <strong className="capitalize">{STAGE_ORDER[currentStageIndex + 1]?.replace(/_/g, " ") || "—"}</strong>
            </p>

            {/* Clearance level selection — show when moving to/past deployment_clearance */}
            {(caseData.current_stage === "competency_signoff" || caseData.current_stage === "deployment_clearance") && (
              <div>
                <Label className="font-semibold">Clearance Decision</Label>
                <Select value={selectedClearance} onValueChange={setSelectedClearance}>
                  <SelectTrigger><SelectValue placeholder="Select clearance level..." /></SelectTrigger>
                  <SelectContent>
                    {CLEARANCE_LEVELS.map(cl => (
                      <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">This determines the new hire's deployment readiness level.</p>
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={progressReason} onChange={(e) => setProgressReason(e.target.value)} placeholder="Any notes for this transition..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialog(false)}>Cancel</Button>
            <Button
              onClick={progressStage}
              disabled={isClearanceStage && !selectedClearance}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Task to {displayStage.replace(/_/g, " ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Task Name</Label>
              <Input value={newTask.task_name} onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })} placeholder="e.g. Submit ID proof" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Owner</Label>
                <Select value={newTask.owner_role} onValueChange={(v) => setNewTask({ ...newTask, owner_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OWNER_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newTask.is_mandatory} onCheckedChange={(v) => setNewTask({ ...newTask, is_mandatory: v })} />
              <Label>Mandatory</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={!newTask.task_name.trim()}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block / Waive / Note Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {actionDialog?.action === "block" ? "Mark Task as Blocked" : actionDialog?.action === "waive" ? "Waive Task" : "Add Note"}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>{actionDialog?.action === "note" ? "Notes" : "Reason"}</Label>
            <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder={actionDialog?.action === "block" ? "Why is this task blocked?" : actionDialog?.action === "waive" ? "Reason for waiving..." : "Add a note..."} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleTaskAction} variant={actionDialog?.action === "block" ? "destructive" : "default"}>
              {actionDialog?.action === "block" ? "Block" : actionDialog?.action === "waive" ? "Waive" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buddy Assignment Dialog */}
      <Dialog open={buddyDialog} onOpenChange={setBuddyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Buddy</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Select Employee</Label>
            <Select value={selectedBuddyId} onValueChange={setSelectedBuddyId}>
              <SelectTrigger><SelectValue placeholder="Choose a buddy..." /></SelectTrigger>
              <SelectContent>
                {allEmployees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuddyDialog(false)}>Cancel</Button>
            <Button onClick={assignBuddy} disabled={!selectedBuddyId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
