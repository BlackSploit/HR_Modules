import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  title: "", department_id: "", designation_id: "", branch_id: "",
  program_id: "", category: "employee", employment_type: "full_time",
  headcount: 1, urgency: "normal", justification: "",
  preferred_experience_years: 0, budget_min: "", budget_max: "",
  shift_pattern: "", required_credentials: "",
  job_description: "", key_responsibilities: "",
  required_qualifications: "", preferred_skills: "",
  location_details: "", benefits: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewRequisitionDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const { data } = await supabase.from("designations").select("id, title").eq("is_active", true);
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);

    const payload: any = {
      title: form.title,
      department_id: form.department_id || null,
      designation_id: form.designation_id || null,
      branch_id: form.branch_id || null,
      program_id: form.program_id || null,
      category: form.category,
      employment_type: form.employment_type,
      headcount: form.headcount,
      urgency: form.urgency,
      justification: form.justification || null,
      preferred_experience_years: form.preferred_experience_years || null,
      budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
      budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
      shift_pattern: form.shift_pattern || null,
      required_credentials: form.required_credentials
        ? form.required_credentials.split(",").map(s => s.trim()).filter(Boolean)
        : [],
      job_description: form.job_description || null,
      key_responsibilities: form.key_responsibilities || null,
      required_qualifications: form.required_qualifications || null,
      preferred_skills: form.preferred_skills || null,
      location_details: form.location_details || null,
      benefits: form.benefits || null,
      requested_by: user!.id,
    };

    const { error } = await supabase.from("job_requisitions").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Requisition created" });
    setForm(emptyForm);
    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ["job_requisitions"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Requisition</DialogTitle></DialogHeader>
        <div className="space-y-5">
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Staff Nurse - Ward B" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={v => set("department_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Designation</Label>
                  <Select value={form.designation_id} onValueChange={v => set("designation_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{designations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Branch</Label>
                  <Select value={form.branch_id} onValueChange={v => set("branch_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Program</Label>
                  <Select value={form.program_id} onValueChange={v => set("program_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => set("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["employee", "consultant", "trainee", "contractor"].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={form.employment_type} onValueChange={v => set("employment_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "full_time", label: "Full Time" },
                        { value: "part_time", label: "Part Time" },
                        { value: "contract", label: "Contract" },
                        { value: "internship", label: "Internship" },
                      ].map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Requirements */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Requirements</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Headcount</Label>
                  <Input type="number" min={1} value={form.headcount} onChange={e => set("headcount", parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Min Experience (years)</Label>
                  <Input type="number" min={0} value={form.preferred_experience_years} onChange={e => set("preferred_experience_years", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Shift Pattern</Label>
                  <Select value={form.shift_pattern} onValueChange={v => set("shift_pattern", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["General", "Rotational", "Night", "Morning", "Evening", "Flexible"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Budget Min (₹/month)</Label>
                  <Input type="number" min={0} value={form.budget_min} onChange={e => set("budget_min", e.target.value)} placeholder="e.g. 25000" />
                </div>
                <div>
                  <Label>Budget Max (₹/month)</Label>
                  <Input type="number" min={0} value={form.budget_max} onChange={e => set("budget_max", e.target.value)} placeholder="e.g. 40000" />
                </div>
              </div>
              <div>
                <Label>Required Credentials (comma-separated)</Label>
                <Input value={form.required_credentials} onChange={e => set("required_credentials", e.target.value)} placeholder="e.g. BSc Nursing, KNC Registration, BLS Certification" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Job Details for Ads */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Job Details (for Sourcing / Ads)</h3>
            <div className="space-y-3">
              <div>
                <Label>Job Description</Label>
                <Textarea value={form.job_description} onChange={e => set("job_description", e.target.value)} placeholder="Full job description..." rows={3} />
              </div>
              <div>
                <Label>Key Responsibilities</Label>
                <Textarea value={form.key_responsibilities} onChange={e => set("key_responsibilities", e.target.value)} placeholder="List key responsibilities..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Required Qualifications</Label>
                  <Textarea value={form.required_qualifications} onChange={e => set("required_qualifications", e.target.value)} placeholder="Education, degrees..." rows={2} />
                </div>
                <div>
                  <Label>Preferred Skills</Label>
                  <Textarea value={form.preferred_skills} onChange={e => set("preferred_skills", e.target.value)} placeholder="Nice-to-have skills..." rows={2} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location Details</Label>
                  <Input value={form.location_details} onChange={e => set("location_details", e.target.value)} placeholder="e.g. Ward B, 2nd Floor" />
                </div>
                <div>
                  <Label>Benefits</Label>
                  <Textarea value={form.benefits} onChange={e => set("benefits", e.target.value)} placeholder="Perks to highlight..." rows={2} />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4: Priority */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Priority & Justification</h3>
            <div className="space-y-3">
              <div>
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={v => set("urgency", v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["normal", "urgent", "critical"].map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Justification</Label>
                <Textarea value={form.justification} onChange={e => set("justification", e.target.value)} placeholder="Reason for this hiring request..." rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Create Requisition"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
