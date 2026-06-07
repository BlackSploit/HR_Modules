import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const jobFamilies = [
  "general", "nursing", "psychiatry", "psychology", "social_work",
  "pharmacy", "lab", "admin", "housekeeping", "security", "counsellor",
  "medical_officer", "rehabilitation", "mphil_psw",
];

const candidateFields = [
  "total_experience_years", "psychiatry_experience_years", "current_salary",
  "expected_ctc", "notice_period_days", "education", "registration_number",
  "nursing_council_reg", "rci_registration", "pharmacy_council_reg",
  "lab_certification", "profession_category", "shift_readiness",
  "accommodation_required", "current_city", "languages_known",
];

const operators = [
  { value: "gte", label: "≥ (at least)" },
  { value: "lte", label: "≤ (at most)" },
  { value: "eq", label: "= (equals)" },
  { value: "neq", label: "≠ (not equal)" },
  { value: "contains", label: "contains" },
  { value: "exists", label: "exists (not empty)" },
];

const ruleTypes = [
  { value: "knockout", label: "Knockout (auto-fail)" },
  { value: "weighted", label: "Weighted (scored)" },
  { value: "red_flag", label: "Red Flag (warning)" },
];

const failActions = [
  { value: "reject", label: "Auto-Reject" },
  { value: "deduct_points", label: "Deduct Points" },
  { value: "flag_only", label: "Flag Only" },
];

const responseTypes = [
  { value: "yes_no", label: "Yes / No" },
  { value: "rating_5", label: "Rating (1-5)" },
  { value: "rating_10", label: "Rating (1-10)" },
  { value: "text", label: "Free Text" },
  { value: "select", label: "Multiple Choice" },
];

const documentTypes = [
  "resume", "id_proof", "address_proof", "qualification_certificate",
  "registration_certificate", "experience_letter", "salary_slip",
  "medical_fitness", "police_clearance", "reference_letter",
  "nursing_council_certificate", "rci_certificate", "pharmacy_council_certificate",
];

export default function ScreeningTemplateBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ruleDialog, setRuleDialog] = useState(false);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    rule_type: "weighted", field_name: "total_experience_years", operator: "gte",
    threshold_value: "", weight: 10, fail_action: "deduct_points", label: "", description: "",
  });
  const [questionForm, setQuestionForm] = useState({
    question_text: "", response_type: "yes_no", is_mandatory: false, max_score: 10, sort_order: 0,
  });
  const [docForm, setDocForm] = useState({
    document_type: "resume", stage_required_at: "screening", is_mandatory: true, description: "",
  });

  const { data: template, isLoading } = useQuery({
    queryKey: ["screening_template", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("screening_templates").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["screening_template_rules", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("screening_template_rules").select("*").eq("template_id", id!).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["screening_template_questions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("screening_template_questions").select("*").eq("template_id", id!).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["screening_template_documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("screening_template_documents").select("*").eq("template_id", id!).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const [generalForm, setGeneralForm] = useState<any>(null);
  const general = generalForm || template;

  const saveGeneral = async () => {
    if (!general) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("screening_templates").update({
        name: general.name, job_family: general.job_family, description: general.description,
        pass_threshold: general.pass_threshold, hold_threshold: general.hold_threshold,
        reject_threshold: general.reject_threshold,
      }).eq("id", id!);
      if (error) throw error;
      toast({ title: "Template saved" });
      queryClient.invalidateQueries({ queryKey: ["screening_template", id] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const activateTemplate = async () => {
    await supabase.from("screening_templates").update({ status: "active", approved_by: user!.id, effective_from: new Date().toISOString().split("T")[0] }).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["screening_template", id] });
    toast({ title: "Template activated" });
  };

  const addRule = async () => {
    if (!ruleForm.label && !ruleForm.field_name) return;
    await supabase.from("screening_template_rules").insert({
      template_id: id!, ...ruleForm,
    });
    queryClient.invalidateQueries({ queryKey: ["screening_template_rules", id] });
    setRuleDialog(false);
    setRuleForm({ rule_type: "weighted", field_name: "total_experience_years", operator: "gte", threshold_value: "", weight: 10, fail_action: "deduct_points", label: "", description: "" });
    toast({ title: "Rule added" });
  };

  const deleteRule = async (ruleId: string) => {
    await supabase.from("screening_template_rules").delete().eq("id", ruleId);
    queryClient.invalidateQueries({ queryKey: ["screening_template_rules", id] });
  };

  const addQuestion = async () => {
    if (!questionForm.question_text.trim()) return;
    await supabase.from("screening_template_questions").insert({
      template_id: id!, ...questionForm,
    });
    queryClient.invalidateQueries({ queryKey: ["screening_template_questions", id] });
    setQuestionDialog(false);
    setQuestionForm({ question_text: "", response_type: "yes_no", is_mandatory: false, max_score: 10, sort_order: 0 });
    toast({ title: "Question added" });
  };

  const deleteQuestion = async (qId: string) => {
    await supabase.from("screening_template_questions").delete().eq("id", qId);
    queryClient.invalidateQueries({ queryKey: ["screening_template_questions", id] });
  };

  const addDoc = async () => {
    await supabase.from("screening_template_documents").insert({
      template_id: id!, ...docForm,
    });
    queryClient.invalidateQueries({ queryKey: ["screening_template_documents", id] });
    setDocDialog(false);
    setDocForm({ document_type: "resume", stage_required_at: "screening", is_mandatory: true, description: "" });
    toast({ title: "Document requirement added" });
  };

  const deleteDoc = async (dId: string) => {
    await supabase.from("screening_template_documents").delete().eq("id", dId);
    queryClient.invalidateQueries({ queryKey: ["screening_template_documents", id] });
  };

  if (isLoading || !template) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading template...</div>;
  }

  const g = general || template;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/recruitment/screening-templates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
          <p className="text-sm text-muted-foreground">
            {template.job_family?.replace(/_/g, " ")} • v{template.version}
          </p>
        </div>
        <Badge variant="outline" className={template.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
          {template.status}
        </Badge>
        {template.status === "draft" && (
          <Button onClick={activateTemplate} variant="default">
            <CheckCircle className="h-4 w-4 mr-2" /> Activate
          </Button>
        )}
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="knockout">Knockout Rules</TabsTrigger>
          <TabsTrigger value="weighted">Weighted Scoring</TabsTrigger>
          <TabsTrigger value="redflags">Red Flags</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input value={g.name} onChange={(e) => setGeneralForm({ ...g, name: e.target.value })} />
                </div>
                <div>
                  <Label>Job Family</Label>
                  <Select value={g.job_family} onValueChange={(v) => setGeneralForm({ ...g, job_family: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {jobFamilies.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={g.description || ""} onChange={(e) => setGeneralForm({ ...g, description: e.target.value })} />
              </div>
              <Button onClick={saveGeneral} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knockout Rules Tab */}
        <TabsContent value="knockout">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Knockout Rules (Auto-Fail)</CardTitle>
              <Button size="sm" onClick={() => { setRuleForm(prev => ({ ...prev, rule_type: "knockout", fail_action: "reject" })); setRuleDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <RulesTable rules={rules.filter((r: any) => r.rule_type === "knockout")} onDelete={deleteRule} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weighted Scoring Tab */}
        <TabsContent value="weighted">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Weighted Scoring Rules</CardTitle>
              <Button size="sm" onClick={() => { setRuleForm(prev => ({ ...prev, rule_type: "weighted", fail_action: "deduct_points" })); setRuleDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <RulesTable rules={rules.filter((r: any) => r.rule_type === "weighted")} onDelete={deleteRule} />
              <p className="text-xs text-muted-foreground mt-3">
                Total weight: {rules.filter((r: any) => r.rule_type === "weighted").reduce((s: number, r: any) => s + (r.weight || 0), 0)} points
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Red Flags Tab */}
        <TabsContent value="redflags">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Red Flag Rules (Warnings)</CardTitle>
              <Button size="sm" onClick={() => { setRuleForm(prev => ({ ...prev, rule_type: "red_flag", fail_action: "flag_only" })); setRuleDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <RulesTable rules={rules.filter((r: any) => r.rule_type === "red_flag")} onDelete={deleteRule} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Required Documents</CardTitle>
              <Button size="sm" onClick={() => setDocDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Document
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Required At</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="capitalize">{d.document_type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="capitalize">{d.stage_required_at}</TableCell>
                      <TableCell>{d.is_mandatory ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteDoc(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {docs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No document requirements added</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recruiter Screen Questions</CardTitle>
              <Button size="sm" onClick={() => setQuestionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Max Score</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q: any, i: number) => (
                    <TableRow key={q.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{q.question_text}</TableCell>
                      <TableCell className="capitalize">{q.response_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{q.max_score}</TableCell>
                      <TableCell>{q.is_mandatory ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {questions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No questions added</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Set score bands for automatic recommendations</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Auto-Pass Threshold (≥)</Label>
                  <Input type="number" value={g.pass_threshold} onChange={(e) => setGeneralForm({ ...g, pass_threshold: parseInt(e.target.value) || 80 })} />
                  <p className="text-xs text-success mt-1">Candidates scoring this or above auto-pass</p>
                </div>
                <div>
                  <Label>Hold Threshold (≥)</Label>
                  <Input type="number" value={g.hold_threshold} onChange={(e) => setGeneralForm({ ...g, hold_threshold: parseInt(e.target.value) || 45 })} />
                  <p className="text-xs text-warning mt-1">Scores between hold & pass need recruiter review</p>
                </div>
                <div>
                  <Label>Reject Below (&lt;)</Label>
                  <Input type="number" value={g.reject_threshold} onChange={(e) => setGeneralForm({ ...g, reject_threshold: parseInt(e.target.value) || 44 })} />
                  <p className="text-xs text-destructive mt-1">Candidates below this are auto-rejected</p>
                </div>
              </div>
              <Button onClick={saveGeneral} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Thresholds"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {ruleForm.rule_type === "knockout" ? "Knockout" : ruleForm.rule_type === "red_flag" ? "Red Flag" : "Scoring"} Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input value={ruleForm.label} onChange={(e) => setRuleForm({ ...ruleForm, label: e.target.value })} placeholder="e.g. Minimum 2 years experience" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Field</Label>
                <Select value={ruleForm.field_name} onValueChange={(v) => setRuleForm({ ...ruleForm, field_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {candidateFields.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Operator</Label>
                <Select value={ruleForm.operator} onValueChange={(v) => setRuleForm({ ...ruleForm, operator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operators.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Threshold Value</Label>
                <Input value={ruleForm.threshold_value} onChange={(e) => setRuleForm({ ...ruleForm, threshold_value: e.target.value })} />
              </div>
              <div>
                <Label>Weight (points)</Label>
                <Input type="number" value={ruleForm.weight} onChange={(e) => setRuleForm({ ...ruleForm, weight: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>On Fail</Label>
              <Select value={ruleForm.fail_action} onValueChange={(v) => setRuleForm({ ...ruleForm, fail_action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {failActions.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addRule} className="w-full">Add Rule</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Screen Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question *</Label>
              <Textarea value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} placeholder="e.g. Is the candidate willing to work rotational shifts?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Response Type</Label>
                <Select value={questionForm.response_type} onValueChange={(v) => setQuestionForm({ ...questionForm, response_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {responseTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Score</Label>
                <Input type="number" value={questionForm.max_score} onChange={(e) => setQuestionForm({ ...questionForm, max_score: parseInt(e.target.value) || 10 })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={questionForm.is_mandatory} onCheckedChange={(v) => setQuestionForm({ ...questionForm, is_mandatory: v })} />
              <Label>Mandatory question</Label>
            </div>
            <Button onClick={addQuestion} className="w-full" disabled={!questionForm.question_text.trim()}>Add Question</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document Requirement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Select value={docForm.document_type} onValueChange={(v) => setDocForm({ ...docForm, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {documentTypes.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Required At Stage</Label>
              <Select value={docForm.stage_required_at} onValueChange={(v) => setDocForm({ ...docForm, stage_required_at: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={docForm.is_mandatory} onCheckedChange={(v) => setDocForm({ ...docForm, is_mandatory: v })} />
              <Label>Mandatory</Label>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} placeholder="Optional notes" />
            </div>
            <Button onClick={addDoc} className="w-full">Add Document Requirement</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RulesTable({ rules, onDelete }: { rules: any[]; onDelete: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead>Field</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>On Fail</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.label || r.field_name}</TableCell>
            <TableCell className="capitalize text-xs">{r.field_name.replace(/_/g, " ")}</TableCell>
            <TableCell className="text-xs">
              {operators.find(o => o.value === r.operator)?.label || r.operator} {r.threshold_value}
            </TableCell>
            <TableCell>{r.weight}pts</TableCell>
            <TableCell className="capitalize text-xs">{r.fail_action.replace(/_/g, " ")}</TableCell>
            <TableCell>
              <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {rules.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No rules added yet</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}

