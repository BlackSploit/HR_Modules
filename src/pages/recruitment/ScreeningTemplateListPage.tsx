import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy, Archive, Search, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const jobFamilies = [
  "general", "nursing", "psychiatry", "psychology", "social_work",
  "pharmacy", "lab", "admin", "housekeeping", "security", "counsellor",
  "medical_officer", "rehabilitation", "mphil_psw",
];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success",
  archived: "bg-destructive/15 text-destructive",
};

export default function ScreeningTemplateListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [filterFamily, setFilterFamily] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", job_family: "general", description: "" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["screening_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = templates.filter((t: any) => {
    if (filterFamily !== "all" && t.job_family !== filterFamily) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("screening_templates").insert({
        name: form.name, job_family: form.job_family, description: form.description,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      toast({ title: "Template created" });
      queryClient.invalidateQueries({ queryKey: ["screening_templates"] });
      setCreateDialog(false);
      setForm({ name: "", job_family: "general", description: "" });
      navigate(`/people/recruitment/screening-templates/${data.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async (template: any) => {
    try {
      const { data, error } = await supabase.from("screening_templates").insert({
        name: `${template.name} (Copy)`, job_family: template.job_family,
        description: template.description, created_by: user!.id,
        pass_threshold: template.pass_threshold, hold_threshold: template.hold_threshold,
        reject_threshold: template.reject_threshold, branches: template.branches,
      }).select().single();
      if (error) throw error;
      // Clone rules, questions, documents
      const [rules, questions, docs] = await Promise.all([
        supabase.from("screening_template_rules").select("*").eq("template_id", template.id),
        supabase.from("screening_template_questions").select("*").eq("template_id", template.id),
        supabase.from("screening_template_documents").select("*").eq("template_id", template.id),
      ]);
      if (rules.data?.length) {
        await supabase.from("screening_template_rules").insert(
          rules.data.map((r: any) => ({ ...r, id: undefined, template_id: data.id }))
        );
      }
      if (questions.data?.length) {
        await supabase.from("screening_template_questions").insert(
          questions.data.map((q: any) => ({ ...q, id: undefined, template_id: data.id }))
        );
      }
      if (docs.data?.length) {
        await supabase.from("screening_template_documents").insert(
          docs.data.map((d: any) => ({ ...d, id: undefined, template_id: data.id }))
        );
      }
      toast({ title: "Template cloned" });
      queryClient.invalidateQueries({ queryKey: ["screening_templates"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleArchive = async (id: string) => {
    await supabase.from("screening_templates").update({ status: "archived" }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["screening_templates"] });
    toast({ title: "Template archived" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Screening Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable screening criteria by job family</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterFamily} onValueChange={setFilterFamily}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Job Families</SelectItem>
            {jobFamilies.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Job Family</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Thresholds</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/people/recruitment/screening-templates/${t.id}`)}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="capitalize">{t.job_family?.replace(/_/g, " ")}</TableCell>
                  <TableCell>v{t.version}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[t.status] || ""}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Pass: {t.pass_threshold}+ / Hold: {t.hold_threshold}+ / Reject: &lt;{t.reject_threshold}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => handleClone(t)} title="Clone">
                        <Copy className="h-4 w-4" />
                      </Button>
                      {t.status !== "archived" && (
                        <Button size="icon" variant="ghost" onClick={() => handleArchive(t.id)} title="Archive">
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {isLoading ? "Loading..." : "No screening templates found. Create one to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Screening Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nursing Staff Screening" />
            </div>
            <div>
              <Label>Job Family</Label>
              <Select value={form.job_family} onValueChange={(v) => setForm({ ...form, job_family: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {jobFamilies.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()} className="w-full">
              {saving ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
