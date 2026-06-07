import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ArrowLeft, Upload, FileText, Loader2, Users, FolderPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const candidateStatuses = ["new","screening","interviewing","selected","offer","pre_boarding","joined","rejected","withdrawn","talent_pool"];
const sources = [
  "direct", "referral", "employee_network", "internal",
  "naukri", "indeed", "shine", "monster", "other_job_portal",
  "linkedin", "facebook_ad", "instagram_ad", "whatsapp", "youtube_ad",
  "campus", "vendor",
  "walk_in", "boomerang", "past_applicant", "passive", "competitor", "outsourced_conversion",
  "pamphlets", "newspaper_ad", "notice_board", "posters"
];
const professionCategories = [
  "Psychiatrist", "Psychologist", "Nurse", "Social Worker (PSW)",
  "MPhil PSW / Programme Coordinator", "Ward Incharge", "Admission Counsellor",
  "Rehab Coordinator", "Duty Medical Officer", "Admin/Support", "Other"
];

const sourcingStages = [
  "identified", "captured", "contacted", "interested", "not_interested",
  "screening", "matched", "shortlisted", "interviewing", "selected",
  "offer_stage", "joined", "nurture", "declined"
];

export default function CandidateListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pipeline");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolType, setNewPoolType] = useState("active");
  const [newPoolDesc, setNewPoolDesc] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", current_city: "",
    source: "direct", source_details: "", current_designation: "", current_employer: "",
    total_experience_years: 0, expected_ctc: 0, notice_period_days: 0,
    profession_category: "", requisition_id: "",
    languages_known: "", shift_readiness: "", current_salary: 0,
    education: "", rci_registration: "",
  });
  const [workHistory, setWorkHistory] = useState<{ employer: string; designation: string; from: string; to: string }[]>([{ employer: "", designation: "", from: "", to: "" }]);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: openRequisitions = [] } = useQuery({
    queryKey: ["open_requisitions"],
    queryFn: async () => {
      const { data } = await supabase.from("job_requisitions")
        .select("id, title, departments(name)")
        .in("status", ["approved", "sourcing"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: talentPools = [] } = useQuery({
    queryKey: ["talent_pools"],
    queryFn: async () => {
      const { data } = await supabase.from("talent_pools").select("*, talent_pool_members(id, candidate_id)").eq("is_active", true);
      return data || [];
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      toast({ title: "Invalid file type", description: "Please upload PDF, DOCX, or TXT files", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setUploadedFile(file);
    setParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const response = await supabase.functions.invoke("parse-resume", {
        body: { fileBase64: base64, fileName: file.name },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to parse resume");
      }

      const { extracted } = response.data;
      if (extracted) {
        setForm(prev => ({
          ...prev,
          first_name: extracted.first_name || prev.first_name,
          last_name: extracted.last_name || prev.last_name,
          email: extracted.email || prev.email,
          phone: extracted.phone || prev.phone,
          current_city: extracted.current_city || prev.current_city,
          current_designation: extracted.current_designation || prev.current_designation,
          current_employer: extracted.current_employer || prev.current_employer,
          total_experience_years: extracted.total_experience_years || prev.total_experience_years,
          expected_ctc: extracted.expected_ctc || prev.expected_ctc,
          notice_period_days: extracted.notice_period_days || prev.notice_period_days,
          profession_category: extracted.profession_category || prev.profession_category,
          languages_known: extracted.languages_known?.join(", ") || prev.languages_known,
          shift_readiness: extracted.shift_readiness || prev.shift_readiness,
          current_salary: extracted.current_salary || prev.current_salary,
          education: extracted.education || prev.education,
          rci_registration: extracted.rci_registration || prev.rci_registration,
        }));
        if (extracted.work_history && Array.isArray(extracted.work_history) && extracted.work_history.length > 0) {
          setWorkHistory(extracted.work_history.map((w: any) => ({
            employer: w.employer || "",
            designation: w.designation || "",
            from: w.from || "",
            to: w.to || "",
          })));
        }
        toast({ title: "CV parsed successfully", description: "Review the extracted details and make corrections if needed" });
      }
    } catch (err: any) {
      console.error("CV parse error:", err);
      toast({ title: "Failed to parse CV", description: err.message || "Please fill in details manually", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" }); return;
    }
    setSaving(true);

    let resumeUrl: string | null = null;

    if (uploadedFile) {
      const ext = uploadedFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(path, uploadedFile);
      if (uploadError) {
        console.error("Resume upload error:", uploadError);
      } else {
        resumeUrl = path;
      }
    }

    // Check for duplicates by phone or email
    let duplicateWarning = false;
    if (form.phone || form.email) {
      let q = supabase.from("candidates").select("id, first_name, last_name");
      if (form.phone) q = q.eq("phone", form.phone);
      if (form.email) q = q.eq("email", form.email);
      const { data: dupes } = await q;
      if (dupes && dupes.length > 0) {
        duplicateWarning = true;
        toast({
          title: "Possible duplicate detected",
          description: `Similar candidate exists: ${dupes[0].first_name} ${dupes[0].last_name}. Saving anyway.`,
          variant: "destructive",
        });
      }
    }

    const languagesArray = form.languages_known
      ? form.languages_known.split(",").map(l => l.trim()).filter(Boolean)
      : [];

    const cleanWorkHistory = workHistory.filter(w => w.employer.trim() || w.designation.trim());

    const { data: newCandidate, error } = await supabase.from("candidates").insert({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      current_city: form.current_city || null,
      source: form.source,
      source_details: form.source_details || null,
      current_designation: form.current_designation || null,
      current_employer: form.current_employer || null,
      total_experience_years: form.total_experience_years || null,
      expected_ctc: form.expected_ctc || null,
      notice_period_days: form.notice_period_days || null,
      profession_category: form.profession_category || null,
      resume_url: resumeUrl,
      created_by: user!.id,
      languages_known: languagesArray.length > 0 ? languagesArray : null,
      shift_readiness: form.shift_readiness || null,
      current_salary: form.current_salary || null,
      education: form.education || null,
      rci_registration: form.rci_registration || null,
      sourcing_stage: "identified",
      consent_status: "pending",
      work_history: cleanWorkHistory.length > 0 ? cleanWorkHistory : [],
      past_employers: cleanWorkHistory.map(w => w.employer).filter(Boolean).join(", ") || null,
    } as any).select("id").single();

    if (error) {
      setSaving(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Link to requisition if selected
    if (form.requisition_id && form.requisition_id !== "none" && newCandidate) {
      await supabase.from("candidate_requisition_links").insert({
        candidate_id: newCandidate.id,
        requisition_id: form.requisition_id,
        linked_by: user!.id,
        current_stage: "new",
      });
    }

    setSaving(false);
    toast({ title: "Candidate added" });
    setDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["candidates"] });
  };

  const resetForm = () => {
    setForm({
      first_name: "", last_name: "", email: "", phone: "", current_city: "",
      source: "direct", source_details: "", current_designation: "", current_employer: "",
      total_experience_years: 0, expected_ctc: 0, notice_period_days: 0,
      profession_category: "", requisition_id: "",
      languages_known: "", shift_readiness: "", current_salary: 0,
      education: "", rci_registration: "",
    });
    setUploadedFile(null);
    setWorkHistory([{ employer: "", designation: "", from: "", to: "" }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return;
    await supabase.from("talent_pools").insert({
      name: newPoolName,
      description: newPoolDesc || null,
      pool_type: newPoolType,
    } as any);
    setPoolDialogOpen(false);
    setNewPoolName("");
    setNewPoolDesc("");
    queryClient.invalidateQueries({ queryKey: ["talent_pools"] });
    toast({ title: "Talent pool created" });
  };

  const filtered = candidates.filter((c: any) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (categoryFilter !== "all" && c.profession_category !== categoryFilter) return false;
    const q = search.toLowerCase();
    if (q && !`${c.first_name} ${c.last_name} ${c.email || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const categoryGroups = professionCategories.map(cat => ({
    category: cat,
    count: candidates.filter((c: any) => c.profession_category === cat).length,
    candidates: candidates.filter((c: any) => c.profession_category === cat),
  })).filter(g => g.count > 0);

  const uncategorizedCount = candidates.filter((c: any) => !c.profession_category).length;

  const poolTypes = [
    "active", "silver_medalist", "passive", "future", "internal_mobility",
    "urgent_replacement", "night_duty", "psychiatry_experienced",
    "rci_registered", "local_district", "internship", "outsourced_conversion"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/recruitment")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-sm text-muted-foreground">Manage all candidates in the hiring pipeline</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Candidate</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="talent-db">Talent Database</TabsTrigger>
          <TabsTrigger value="talent-pools">Talent Pools</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {candidateStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {professionCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-8 text-center text-muted-foreground">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No candidates found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Sourcing Stage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c: any) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/people/recruitment/candidates/${c.id}`)}>
                        <TableCell>
                          <p className="font-medium">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-muted-foreground">{c.current_designation || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{c.email || "—"}</p>
                          <p className="text-xs text-muted-foreground">{c.phone || "—"}</p>
                        </TableCell>
                        <TableCell>
                          {c.profession_category ? (
                            <Badge variant="secondary" className="text-xs">{c.profession_category}</Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>{c.total_experience_years ? `${c.total_experience_years} yrs` : "—"}</TableCell>
                        <TableCell className="capitalize">{c.source?.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{(c.sourcing_stage || "identified").replace("_"," ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{c.status.replace("_"," ")}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="talent-db" className="space-y-4">
          <p className="text-sm text-muted-foreground">Browse candidates grouped by professional category</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryGroups.map(g => (
              <Card key={g.category} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setCategoryFilter(g.category); setActiveTab("pipeline"); }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {g.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{g.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {g.candidates.filter((c: any) => !["rejected","withdrawn","joined"].includes(c.status)).length} active in pipeline
                  </p>
                </CardContent>
              </Card>
            ))}
            {uncategorizedCount > 0 && (
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setCategoryFilter("all"); setActiveTab("pipeline"); }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Uncategorized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-muted-foreground">{uncategorizedCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">No category assigned</p>
                </CardContent>
              </Card>
            )}
            {categoryGroups.length === 0 && uncategorizedCount === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">No candidates in the database yet</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="talent-pools" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Named talent pools for organized candidate management</p>
            <Button size="sm" onClick={() => setPoolDialogOpen(true)}><FolderPlus className="h-4 w-4 mr-2" />Create Pool</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(talentPools as any[]).map((pool: any) => (
              <Card key={pool.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {pool.name}
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit capitalize text-xs">{pool.pool_type.replace("_", " ")}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{pool.talent_pool_members?.length || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pool.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            ))}
            {talentPools.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">No talent pools created yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Candidate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* CV Upload */}
            <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-2 border-muted-foreground/25">
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileUpload} />
              {parsing ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Parsing CV with AI...</span>
                </div>
              ) : uploadedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload CV to auto-fill details</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Choose File
                  </Button>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT (max 10MB)</p>
                </>
              )}
            </div>

            {/* Basic Info */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Basic Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.current_city} onChange={(e) => setForm({ ...form, current_city: e.target.value })} /></div>
              <div>
                <Label>Source Channel</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sources.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Source Details</Label><Input placeholder="e.g. Referrer name, job board URL" value={form.source_details} onChange={(e) => setForm({ ...form, source_details: e.target.value })} /></div>
              <div>
                <Label>Link to Requisition</Label>
                <Select value={form.requisition_id} onValueChange={(v) => setForm({ ...form, requisition_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(openRequisitions as any[]).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} ({r.departments?.name || "—"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Professional */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Professional Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Current Designation</Label><Input value={form.current_designation} onChange={(e) => setForm({ ...form, current_designation: e.target.value })} /></div>
              <div><Label>Current Employer</Label><Input value={form.current_employer} onChange={(e) => setForm({ ...form, current_employer: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Experience (years)</Label><Input type="number" min={0} value={form.total_experience_years} onChange={(e) => setForm({ ...form, total_experience_years: parseFloat(e.target.value) || 0 })} /></div>
              <div>
                <Label>Profession Category</Label>
                <Select value={form.profession_category} onValueChange={(v) => setForm({ ...form, profession_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{professionCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Education</Label><Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="e.g. MPhil Clinical Psychology" /></div>
              <div><Label>RCI / Council Registration</Label><Input value={form.rci_registration} onChange={(e) => setForm({ ...form, rci_registration: e.target.value })} placeholder="Registration number" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Current Salary (₹)</Label><Input type="number" min={0} value={form.current_salary} onChange={(e) => setForm({ ...form, current_salary: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Expected CTC (₹)</Label><Input type="number" min={0} value={form.expected_ctc} onChange={(e) => setForm({ ...form, expected_ctc: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Languages Known</Label><Input value={form.languages_known} onChange={(e) => setForm({ ...form, languages_known: e.target.value })} placeholder="e.g. English, Hindi, Malayalam" /></div>
              <div>
                <Label>Shift Readiness</Label>
                <Select value={form.shift_readiness} onValueChange={(v) => setForm({ ...form, shift_readiness: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day_only">Day Only</SelectItem>
                    <SelectItem value="night_only">Night Only</SelectItem>
                    <SelectItem value="rotational">Rotational</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Notice Period (days)</Label><Input type="number" min={0} value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: parseInt(e.target.value) || 0 })} /></div>
            </div>

            {/* Previous Experience */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Previous Experience</h4>
            {workHistory.map((wh, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end">
                <div>
                  {idx === 0 && <Label className="text-xs">Employer</Label>}
                  <Input placeholder="Hospital / Org" value={wh.employer} onChange={(e) => {
                    const updated = [...workHistory]; updated[idx] = { ...wh, employer: e.target.value }; setWorkHistory(updated);
                  }} />
                </div>
                <div>
                  {idx === 0 && <Label className="text-xs">Designation</Label>}
                  <Input placeholder="Role / Title" value={wh.designation} onChange={(e) => {
                    const updated = [...workHistory]; updated[idx] = { ...wh, designation: e.target.value }; setWorkHistory(updated);
                  }} />
                </div>
                <div>
                  {idx === 0 && <Label className="text-xs">From</Label>}
                  <Input type="month" value={wh.from} onChange={(e) => {
                    const updated = [...workHistory]; updated[idx] = { ...wh, from: e.target.value }; setWorkHistory(updated);
                  }} className="w-[130px]" />
                </div>
                <div>
                  {idx === 0 && <Label className="text-xs">To</Label>}
                  <Input type="month" value={wh.to} onChange={(e) => {
                    const updated = [...workHistory]; updated[idx] = { ...wh, to: e.target.value }; setWorkHistory(updated);
                  }} className="w-[130px]" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => {
                  if (workHistory.length > 1) setWorkHistory(workHistory.filter((_, i) => i !== idx));
                  else setWorkHistory([{ employer: "", designation: "", from: "", to: "" }]);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setWorkHistory([...workHistory, { employer: "", designation: "", from: "", to: "" }])}>
              <Plus className="h-4 w-4 mr-1" />Add Experience
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || parsing}>{saving ? "Saving..." : "Add Candidate"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Pool Dialog */}
      <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Talent Pool</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Pool Name *</Label><Input value={newPoolName} onChange={(e) => setNewPoolName(e.target.value)} placeholder="e.g. Night Duty Nurses" /></div>
            <div>
              <Label>Pool Type</Label>
              <Select value={newPoolType} onValueChange={setNewPoolType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {poolTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={newPoolDesc} onChange={(e) => setNewPoolDesc(e.target.value)} placeholder="Brief description..." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPoolDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreatePool}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
