import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const professionCategories = [
  "Psychiatrist", "Clinical Psychologist", "Psychiatric Social Worker",
  "MPhil PSW / Programme Coordinator", "Staff Nurse", "Nursing Assistant",
  "Counsellor", "Occupational Therapist", "Lab Technician", "Pharmacist",
  "Admin / Front Desk", "Housekeeping / Support", "Driver", "Cook / Kitchen",
  "Security", "IT / Technical", "HR / Accounts", "Other",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisitionId: string;
  onCandidateAdded: () => void;
}

export default function QuickAddCandidateDialog({ open, onOpenChange, requisitionId, onCandidateAdded }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    profession_category: "", source: "direct",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const response = await supabase.functions.invoke("parse-resume", {
        body: { fileBase64: base64, fileName: file.name },
      });
      if (response.error) throw new Error(response.error.message);
      const { extracted } = response.data;
      if (extracted) {
        setForm(prev => ({
          ...prev,
          first_name: extracted.first_name || prev.first_name,
          last_name: extracted.last_name || prev.last_name,
          email: extracted.email || prev.email,
          phone: extracted.phone || prev.phone,
          profession_category: extracted.profession_category || prev.profession_category,
        }));
        toast({ title: "Resume parsed", description: "Review extracted details" });
      }
    } catch (err: any) {
      toast({ title: "Parse failed", description: err.message, variant: "destructive" });
    } finally { setParsing(false); }
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: "Name required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      let resumeUrl: string | null = null;
      if (uploadedFile) {
        const ext = uploadedFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("resumes").upload(path, uploadedFile);
        if (!uploadError) resumeUrl = path;
      }
      const { data: newCandidate, error } = await supabase.from("candidates").insert({
        first_name: form.first_name, last_name: form.last_name,
        email: form.email || null, phone: form.phone || null,
        profession_category: form.profession_category || null,
        source: form.source, resume_url: resumeUrl,
        created_by: user!.id, sourcing_stage: "identified", consent_status: "pending",
      } as any).select("id").single();
      if (error) throw error;
      await supabase.from("candidate_requisition_links").insert({
        candidate_id: newCandidate.id, requisition_id: requisitionId,
        linked_by: user!.id, current_stage: "new",
      });
      toast({ title: "Candidate added & linked" });
      onCandidateAdded();
      onOpenChange(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", profession_category: "", source: "direct" });
      setUploadedFile(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Quick Add Candidate</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Resume Upload */}
          <div>
            <Label>Upload Resume (optional)</Label>
            <div className="mt-1">
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
                {parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing...</> :
                  uploadedFile ? <><FileText className="h-4 w-4 mr-2" />{uploadedFile.name}</> :
                  <><Upload className="h-4 w-4 mr-2" />Upload Resume</>}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.profession_category} onValueChange={(val) => setForm({ ...form, profession_category: val })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{professionCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add & Link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
