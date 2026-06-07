import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  offer?: any;
  requisition?: any;
}

export default function ConvertToEmployeeDialog({ open, onOpenChange, candidate, offer, requisition }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    employee_code: "",
    joining_date: offer?.joining_date || "",
  });
  const [saving, setSaving] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["onboarding_templates_active"],
    queryFn: async () => {
      const { data } = await supabase.from("onboarding_templates").select("*").eq("is_active", true);
      return data || [];
    },
    enabled: open,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleConvert = async () => {
    if (!candidate) return;
    setSaving(true);

    try {
      // 1. Create employee
      const empPayload: any = {
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        status: "onboarding" as any,
        date_of_joining: form.joining_date || null,
        employee_code: form.employee_code || null,
        branch_id: offer?.branch_id || requisition?.branch_id || null,
        department_id: offer?.department_id || requisition?.department_id || null,
        designation_id: offer?.designation_id || requisition?.designation_id || null,
      };

      const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert(empPayload)
        .select()
        .single();
      if (empError) throw empError;

      // 2. Create onboarding case
      const casePayload: any = {
        employee_id: employee.id,
        candidate_id: candidate.id,
        offer_id: offer?.id || null,
        requisition_id: requisition?.id || offer?.requisition_id || null,
        branch_id: empPayload.branch_id,
        department_id: empPayload.department_id,
        designation_id: empPayload.designation_id,
        role_family: candidate.profession_category || requisition?.category || null,
        joining_date: form.joining_date || null,
        onboarding_owner_id: user?.id,
        current_stage: "preboarding",
      };

      const { data: onboardingCase, error: caseError } = await supabase
        .from("onboarding_cases")
        .insert(casePayload)
        .select()
        .single();
      if (caseError) throw caseError;

      // 3. Auto-generate tasks from template
      const template = templates.find((t: any) => t.id === selectedTemplateId);
      if (template && template.stage_blocks) {
        const blocks = template.stage_blocks as any[];
        const taskInserts: any[] = [];
        blocks.forEach((block: any) => {
          (block.tasks || []).forEach((task: any) => {
            const dueDate = form.joining_date
              ? new Date(new Date(form.joining_date).getTime() + (task.sla_days || 3) * 86400000).toISOString().split("T")[0]
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

      // 4. Record stage history
      await supabase.from("onboarding_stage_history").insert({
        case_id: onboardingCase.id,
        from_stage: "offer_accepted",
        to_stage: "preboarding",
        moved_by: user?.id,
        reason: "Converted from recruitment pipeline",
      });

      // 5. Update candidate status
      await supabase.from("candidates").update({ status: "hired" }).eq("id", candidate.id);

      toast({ title: "Employee created & onboarding started!" });
      onOpenChange(false);
      navigate(`/people/onboarding/${onboardingCase.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Auto-match template
  const matchedTemplate = templates.find((t: any) =>
    t.role_family?.toLowerCase() === (candidate?.profession_category || "").toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convert to Employee & Start Onboarding
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">{candidate?.first_name} {candidate?.last_name}</p>
            <p className="text-xs text-muted-foreground">{candidate?.profession_category || "—"} · {candidate?.phone || candidate?.email || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employee Code</Label>
              <Input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} placeholder="e.g. MHR-0045" />
            </div>
            <div>
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Onboarding Template</Label>
            <Select value={selectedTemplateId || matchedTemplate?.id || ""} onValueChange={setSelectedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template (manual setup)</SelectItem>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.role_family})
                    {t.id === matchedTemplate?.id ? " ★ Auto-match" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {matchedTemplate && !selectedTemplateId && (
              <p className="text-xs text-green-600 mt-1">Auto-matched: {matchedTemplate.name}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleConvert} disabled={saving}>
            {saving ? "Creating..." : "Convert & Start Onboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
