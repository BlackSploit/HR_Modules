import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, ClipboardList, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ALL_FRAMEWORKS, type OnboardingFramework } from "@/data/onboarding-frameworks";

const ROLE_FAMILIES = [
  "Psychiatrist", "Clinical Psychologist", "Psychiatric Social Worker", "Staff Nurse",
  "Nursing Assistant", "Counsellor", "Occupational Therapist", "Lab Technician",
  "Pharmacist", "Admin / Front Desk", "Housekeeping / Support", "Driver", "Cook / Kitchen",
  "Security", "IT / Technical", "HR / Accounts", "PCA", "Other",
];

const STAGES = [
  "preboarding", "day1_orientation", "dept_induction", "role_induction",
  "supervised_practice", "competency_signoff", "deployment_clearance",
];

const TASK_TYPES = ["document", "training", "checklist", "sign_off", "access"];
const OWNER_ROLES = ["hr", "department_head", "buddy", "trainer", "it_admin", "clinical_lead", "center_head"];

interface StageTask {
  name: string;
  type: string;
  owner_role: string;
  evidence_required: boolean;
  sla_days: number;
  group?: string;
}

interface StageBlock {
  stage: string;
  tasks: StageTask[];
}

const emptyTemplate = {
  name: "",
  role_family: "",
  stage_blocks: STAGES.map(s => ({ stage: s, tasks: [] })) as StageBlock[],
};

export default function OnboardingTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [form, setForm] = useState(emptyTemplate);
  const [activeStage, setActiveStage] = useState("preboarding");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState("checklist");
  const [newTaskOwner, setNewTaskOwner] = useState("hr");
  const [newTaskSla, setNewTaskSla] = useState(3);
  const [newTaskGroup, setNewTaskGroup] = useState("");
  const [newTaskEvidence, setNewTaskEvidence] = useState(false);

  // Import framework dialog
  const [importDialog, setImportDialog] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["onboarding_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select("*")
        .order("role_family", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const openNew = () => {
    setEditingTemplate(null);
    setForm(emptyTemplate);
    setActiveStage("preboarding");
    setEditDialog(true);
  };

  const openEdit = (t: any) => {
    setEditingTemplate(t);
    const blocks = (t.stage_blocks || []) as StageBlock[];
    const merged = STAGES.map(s => {
      const existing = blocks.find((b: StageBlock) => b.stage === s);
      return existing || { stage: s, tasks: [] };
    });
    setForm({ name: t.name, role_family: t.role_family, stage_blocks: merged });
    setActiveStage("preboarding");
    setEditDialog(true);
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;
    const updated = form.stage_blocks.map(b => {
      if (b.stage === activeStage) {
        return {
          ...b,
          tasks: [...b.tasks, {
            name: newTaskName,
            type: newTaskType,
            owner_role: newTaskOwner,
            evidence_required: newTaskEvidence,
            sla_days: newTaskSla,
            ...(newTaskGroup.trim() ? { group: newTaskGroup.trim() } : {}),
          }],
        };
      }
      return b;
    });
    setForm({ ...form, stage_blocks: updated });
    setNewTaskName("");
    setNewTaskGroup("");
    setNewTaskEvidence(false);
  };

  const removeTask = (stageKey: string, idx: number) => {
    const updated = form.stage_blocks.map(b => {
      if (b.stage === stageKey) {
        return { ...b, tasks: b.tasks.filter((_, i) => i !== idx) };
      }
      return b;
    });
    setForm({ ...form, stage_blocks: updated });
  };

  const saveTemplate = async () => {
    if (!form.name || !form.role_family) {
      toast({ title: "Required", description: "Name and role family are required", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name,
      role_family: form.role_family,
      stage_blocks: JSON.parse(JSON.stringify(form.stage_blocks)),
      is_active: true,
    };

    if (editingTemplate) {
      const { error } = await supabase.from("onboarding_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("onboarding_templates").insert([payload] as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }

    queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
    setEditDialog(false);
    toast({ title: editingTemplate ? "Template updated" : "Template created" });
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("onboarding_templates").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
    toast({ title: "Template deleted" });
  };

  const importFramework = async (fw: OnboardingFramework) => {
    const payload = {
      name: fw.name,
      role_family: fw.role_family,
      stage_blocks: JSON.parse(JSON.stringify(fw.stage_blocks)),
      is_active: true,
    };

    const { error } = await supabase.from("onboarding_templates").insert([payload] as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
    setImportDialog(false);
    toast({ title: "Framework imported", description: `${fw.role_family} template created with ${fw.stage_blocks.reduce((s, b) => s + b.tasks.length, 0)} tasks` });
  };

  const currentBlock = form.stage_blocks.find(b => b.stage === activeStage);
  const totalTasks = (t: any) => {
    const blocks = (t.stage_blocks || []) as StageBlock[];
    return blocks.reduce((sum: number, b: StageBlock) => sum + b.tasks.length, 0);
  };

  // Group tasks by group label for display
  const groupedTasks = (tasks: StageTask[]) => {
    const groups: Record<string, StageTask[]> = {};
    const ungrouped: StageTask[] = [];
    tasks.forEach(t => {
      if (t.group) {
        if (!groups[t.group]) groups[t.group] = [];
        groups[t.group].push(t);
      } else {
        ungrouped.push(t);
      }
    });
    return { groups, ungrouped };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/onboarding")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Onboarding Templates</h1>
          <p className="text-sm text-muted-foreground">Define stage-gate checklists by role family</p>
        </div>
        <Button variant="outline" onClick={() => setImportDialog(true)}>
          <Download className="h-4 w-4 mr-1" />Import Framework
        </Button>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Template</Button>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No onboarding templates yet</p>
            <div className="flex gap-2 justify-center mt-3">
              <Button variant="outline" onClick={() => setImportDialog(true)}>
                <Download className="h-4 w-4 mr-1" />Import Framework
              </Button>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Create from Scratch</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => {
            const blocks = (t.stage_blocks || []) as StageBlock[];
            const evidenceCount = blocks.reduce((s, b) => s + b.tasks.filter(tk => tk.evidence_required).length, 0);
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.role_family}</p>
                    </div>
                    <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Draft"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    <span>{totalTasks(t)} tasks</span>
                    <span>·</span>
                    <span>{STAGES.length} stages</span>
                    {evidenceCount > 0 && (
                      <>
                        <span>·</span>
                        <span>{evidenceCount} evidence req.</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Onboarding Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Staff Nurse Onboarding" />
              </div>
              <div>
                <Label>Role Family</Label>
                <Select value={form.role_family} onValueChange={(v) => setForm({ ...form, role_family: v })}>
                  <SelectTrigger><SelectValue placeholder="Select role family" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_FAMILIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stage Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b pb-2">
              {STAGES.map(s => {
                const block = form.stage_blocks.find(b => b.stage === s);
                const count = block?.tasks.length || 0;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveStage(s)}
                    className={`px-3 py-1.5 rounded-t-lg text-xs font-medium whitespace-nowrap transition-colors
                      ${activeStage === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}
                    `}
                  >
                    {s.replace(/_/g, " ")} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tasks for active stage — grouped */}
            <div className="space-y-3">
              {currentBlock && (() => {
                const { groups, ungrouped } = groupedTasks(currentBlock.tasks);
                return (
                  <>
                    {Object.entries(groups).map(([groupName, grpTasks]) => (
                      <div key={groupName} className="space-y-1">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">{groupName}</p>
                        {grpTasks.map((task, idx) => {
                          const realIdx = currentBlock.tasks.indexOf(task);
                          return (
                            <div key={realIdx} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                              <div>
                                <span className="font-medium">{task.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({task.type} · {task.owner_role} · {task.sla_days}d{task.evidence_required ? " · 📎" : ""})
                                </span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeTask(activeStage, realIdx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {ungrouped.length > 0 && (
                      <div className="space-y-1">
                        {Object.keys(groups).length > 0 && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other</p>}
                        {ungrouped.map((task) => {
                          const realIdx = currentBlock.tasks.indexOf(task);
                          return (
                            <div key={realIdx} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                              <div>
                                <span className="font-medium">{task.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({task.type} · {task.owner_role} · {task.sla_days}d{task.evidence_required ? " · 📎" : ""})
                                </span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeTask(activeStage, realIdx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {currentBlock.tasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No tasks in this stage. Add one below.</p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Add Task */}
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground">Add Task</p>
              <div className="grid grid-cols-4 gap-2">
                <Input className="col-span-2" placeholder="Task name" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} />
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newTaskOwner} onValueChange={setNewTaskOwner}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OWNER_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Input type="number" min={1} value={newTaskSla} onChange={(e) => setNewTaskSla(parseInt(e.target.value) || 1)} className="w-20" />
                <span className="text-xs text-muted-foreground">SLA days</span>
                <Input placeholder="Group label (optional)" value={newTaskGroup} onChange={(e) => setNewTaskGroup(e.target.value)} className="w-40" />
                <div className="flex items-center gap-1">
                  <Switch checked={newTaskEvidence} onCheckedChange={setNewTaskEvidence} className="scale-75" />
                  <span className="text-xs text-muted-foreground">Evidence</span>
                </div>
                <Button size="sm" onClick={addTask} className="ml-auto"><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={saveTemplate}>{editingTemplate ? "Update" : "Create"} Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Framework Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Pre-Built Framework</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select a role-specific onboarding framework. This will create a new template with all tasks, groups, and competencies pre-configured.</p>
          <div className="space-y-3 mt-2">
            {ALL_FRAMEWORKS.map((fw) => {
              const taskCount = fw.stage_blocks.reduce((s, b) => s + b.tasks.length, 0);
              const existing = templates.find((t: any) => t.role_family === fw.role_family);
              return (
                <Card key={fw.role_family} className={`cursor-pointer transition-shadow hover:shadow-md ${existing ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{fw.role_family}</p>
                      <p className="text-xs text-muted-foreground">
                        {taskCount} tasks · {fw.competencies.length} competencies · {STAGES.length} stages
                      </p>
                      {existing && <p className="text-xs text-amber-600 mt-0.5">Template already exists for this role</p>}
                    </div>
                    <Button
                      size="sm"
                      variant={existing ? "outline" : "default"}
                      onClick={() => importFramework(fw)}
                    >
                      <Download className="h-3 w-3 mr-1" />{existing ? "Import Again" : "Import"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
