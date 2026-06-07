import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, CheckCircle, XCircle, Clock, Star, FileCheck, Shield, Phone, MessageCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const verificationTypes = ["identity", "qualification", "registration", "employment", "reference", "background", "fitness"];
const outreachChannels = ["call", "whatsapp", "email", "linkedin", "referral_followup"];
const responseStatuses = ["no_answer", "responded", "not_interested", "interested", "not_reachable"];
const sourcingStages = [
  "identified", "captured", "contacted", "interested", "not_interested",
  "screening", "matched", "shortlisted", "interviewing", "selected",
  "offer_stage", "joined", "nurture", "declined"
];

export default function CandidateProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [interviewDialog, setInterviewDialog] = useState(false);
  const [offerDialog, setOfferDialog] = useState(false);
  const [outreachDialog, setOutreachDialog] = useState(false);
  const [savingInterview, setSavingInterview] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [savingOutreach, setSavingOutreach] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ round_name: "", scheduled_at: "", round_number: 1 });
  const [offerForm, setOfferForm] = useState({ joining_date: "", designation_id: "", department_id: "", branch_id: "", base_salary: 0 });
  const [outreachForm, setOutreachForm] = useState({
    channel: "call", response_status: "no_answer", notes: "", next_followup_date: "", interest_level: 0,
  });

  const { data: candidate } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stageHistory = [] } = useQuery({
    queryKey: ["candidate_stage_history", id],
    queryFn: async () => {
      const { data } = await supabase.from("candidate_stage_history").select("*").eq("candidate_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: screenings = [] } = useQuery({
    queryKey: ["screening_forms", id],
    queryFn: async () => {
      const { data } = await supabase.from("screening_forms").select("*").eq("candidate_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: screeningRuns = [] } = useQuery({
    queryKey: ["screening_runs_candidate", id],
    queryFn: async () => {
      const { data } = await supabase.from("screening_runs").select("*, screening_result_items(*)").eq("candidate_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["interview_rounds", id],
    queryFn: async () => {
      const { data } = await supabase.from("interview_rounds").select("*").eq("candidate_id", id!).order("round_number");
      return data || [];
    },
  });

  const { data: verifications = [] } = useQuery({
    queryKey: ["candidate_verifications", id],
    queryFn: async () => {
      const { data } = await supabase.from("candidate_verifications").select("*").eq("candidate_id", id!);
      return data || [];
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["offers", id],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("*, designations(title), departments(name), branches(name)").eq("candidate_id", id!).order("version", { ascending: false });
      return data || [];
    },
  });

  const { data: outreachLogs = [] } = useQuery({
    queryKey: ["outreach_logs", id],
    queryFn: async () => {
      const { data } = await supabase.from("candidate_outreach_logs").select("*").eq("candidate_id", id!).order("contacted_at", { ascending: false });
      return data || [];
    },
  });

  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: async () => { const { data } = await supabase.from("departments").select("id, name").eq("is_active", true); return data || []; } });
  const { data: designations = [] } = useQuery({ queryKey: ["designations"], queryFn: async () => { const { data } = await supabase.from("designations").select("id, title").eq("is_active", true); return data || []; } });
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: async () => { const { data } = await supabase.from("branches").select("id, name").eq("is_active", true); return data || []; } });

  const moveStage = async (newStage: string) => {
    if (!candidate) return;
    await supabase.from("candidate_stage_history").insert({
      candidate_id: id!, from_stage: candidate.status, to_stage: newStage, moved_by: user!.id,
    });
    await supabase.from("candidates").update({ status: newStage }).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["candidate", id] });
    queryClient.invalidateQueries({ queryKey: ["candidate_stage_history", id] });
    toast({ title: `Moved to ${newStage.replace("_", " ")}` });
  };

  const updateSourcingStage = async (newStage: string) => {
    await supabase.from("candidates").update({ sourcing_stage: newStage } as any).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["candidate", id] });
    toast({ title: `Sourcing stage: ${newStage.replace("_", " ")}` });
  };

  const initVerifications = async () => {
    const existing = verifications.map((v: any) => v.verification_type);
    const toCreate = verificationTypes.filter(t => !existing.includes(t));
    if (toCreate.length === 0) return;
    await supabase.from("candidate_verifications").insert(
      toCreate.map(t => ({ candidate_id: id!, verification_type: t }))
    );
    queryClient.invalidateQueries({ queryKey: ["candidate_verifications", id] });
    toast({ title: "Verification checklist created" });
  };

  const updateVerification = async (vId: string, status: string) => {
    await supabase.from("candidate_verifications").update({
      status, verified_by: user!.id, verified_at: status === "verified" ? new Date().toISOString() : null,
    }).eq("id", vId);
    queryClient.invalidateQueries({ queryKey: ["candidate_verifications", id] });
  };

  const handleScheduleInterview = async () => {
    if (!interviewForm.round_name) return;
    setSavingInterview(true);
    await supabase.from("interview_rounds").insert({
      candidate_id: id!, round_name: interviewForm.round_name,
      round_number: interviewForm.round_number,
      scheduled_at: interviewForm.scheduled_at || null,
      interviewer_id: user!.id,
    });
    setSavingInterview(false);
    setInterviewDialog(false);
    queryClient.invalidateQueries({ queryKey: ["interview_rounds", id] });
    toast({ title: "Interview scheduled" });
  };

  const completeInterview = async (intId: string, recommendation: string, score: number) => {
    await supabase.from("interview_rounds").update({
      status: "completed", recommendation, overall_score: score, completed_at: new Date().toISOString(),
    }).eq("id", intId);
    queryClient.invalidateQueries({ queryKey: ["interview_rounds", id] });
  };

  const handleCreateOffer = async () => {
    setSavingOffer(true);
    await supabase.from("offers").insert({
      candidate_id: id!,
      joining_date: offerForm.joining_date || null,
      designation_id: offerForm.designation_id || null,
      department_id: offerForm.department_id || null,
      branch_id: offerForm.branch_id || null,
      compensation_details: { base_salary: offerForm.base_salary },
      created_by: user!.id,
    });
    setSavingOffer(false);
    setOfferDialog(false);
    queryClient.invalidateQueries({ queryKey: ["offers", id] });
    toast({ title: "Offer created" });
  };

  const handleLogOutreach = async () => {
    setSavingOutreach(true);
    await supabase.from("candidate_outreach_logs").insert({
      candidate_id: id!,
      channel: outreachForm.channel,
      contacted_by: user!.id,
      response_status: outreachForm.response_status,
      notes: outreachForm.notes || null,
      next_followup_date: outreachForm.next_followup_date || null,
      interest_level: outreachForm.interest_level || null,
    } as any);
    // Update candidate last_contacted_at and next_followup_date
    await supabase.from("candidates").update({
      last_contacted_at: new Date().toISOString(),
      next_followup_date: outreachForm.next_followup_date || null,
      ...(outreachForm.response_status === "interested" ? { sourcing_stage: "interested" } : {}),
      ...(outreachForm.response_status === "not_interested" ? { sourcing_stage: "not_interested" } : {}),
    } as any).eq("id", id!);
    setSavingOutreach(false);
    setOutreachDialog(false);
    setOutreachForm({ channel: "call", response_status: "no_answer", notes: "", next_followup_date: "", interest_level: 0 });
    queryClient.invalidateQueries({ queryKey: ["outreach_logs", id] });
    queryClient.invalidateQueries({ queryKey: ["candidate", id] });
    toast({ title: "Outreach logged" });
  };

  const convertToEmployee = async () => {
    if (!candidate) return;
    const latestOffer = offers[0];
    const { error } = await supabase.from("employees").insert({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      city: candidate.current_city,
      gender: candidate.gender as any,
      date_of_birth: candidate.date_of_birth,
      department_id: latestOffer?.department_id || null,
      designation_id: latestOffer?.designation_id || null,
      branch_id: latestOffer?.branch_id || null,
      date_of_joining: latestOffer?.joining_date || new Date().toISOString().split("T")[0],
      status: "probation",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await moveStage("joined");
    toast({ title: "Candidate converted to employee!" });
    navigate("/people/employees");
  };

  if (!candidate) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const statusIcon = { new: Clock, screening: FileCheck, interviewing: Star, selected: CheckCircle, offer: FileCheck, pre_boarding: UserPlus, joined: CheckCircle, rejected: XCircle, withdrawn: XCircle, talent_pool: Star };
  const StIcon = (statusIcon as any)[candidate.status] || Clock;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/recruitment/candidates")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{candidate.first_name} {candidate.last_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize gap-1"><StIcon className="h-3 w-3" />{candidate.status.replace("_"," ")}</Badge>
            {candidate.source && <Badge variant="secondary" className="capitalize">{candidate.source}</Badge>}
            {(candidate as any).sourcing_stage && (
              <Badge variant="outline" className="capitalize text-xs">Sourcing: {((candidate as any).sourcing_stage || "identified").replace("_"," ")}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOutreachDialog(true)}><Phone className="h-4 w-4 mr-2" />Log Contact</Button>
          {candidate.status === "selected" && <Button variant="outline" onClick={() => setOfferDialog(true)}>Create Offer</Button>}
          {candidate.status === "pre_boarding" && <Button onClick={convertToEmployee}><UserPlus className="h-4 w-4 mr-2" />Convert to Employee</Button>}
        </div>
      </div>

      {/* Stage Actions */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground self-center mr-2">Move to:</span>
            {["screening","interviewing","selected","offer","pre_boarding","rejected","talent_pool"]
              .filter(s => s !== candidate.status)
              .map(s => (
                <Button key={s} variant="outline" size="sm" className="capitalize" onClick={() => moveStage(s)}>
                  {s.replace("_"," ")}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screening">Screening ({screeningRuns.length})</TabsTrigger>
          <TabsTrigger value="outreach">Outreach ({outreachLogs.length})</TabsTrigger>
          <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
          <TabsTrigger value="verification">Verification ({verifications.length})</TabsTrigger>
          <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({stageHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{candidate.email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{candidate.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{candidate.current_city || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Preferred Location</span><span>{(candidate as any).preferred_location || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Languages</span><span>{(candidate as any).languages_known?.join(", ") || "—"}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Professional</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{candidate.profession_category || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Role</span><span>{candidate.current_designation || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employer</span><span>{candidate.current_employer || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span>{candidate.total_experience_years ? `${candidate.total_experience_years} yrs` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Education</span><span>{(candidate as any).education || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Notice Period</span><span>{candidate.notice_period_days ? `${candidate.notice_period_days} days` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Salary</span><span>{(candidate as any).current_salary ? `₹${(candidate as any).current_salary}` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expected CTC</span><span>{candidate.expected_ctc ? `₹${candidate.expected_ctc}` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shift Readiness</span><span className="capitalize">{((candidate as any).shift_readiness || "—").replace("_", " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">RCI Registration</span><span>{(candidate as any).rci_registration || "—"}</span></div>
              </CardContent>
            </Card>
          </div>
          {/* Sourcing Stage */}
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Sourcing Stage</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {sourcingStages.map(s => (
                  <Button
                    key={s}
                    variant={(candidate as any).sourcing_stage === s ? "default" : "outline"}
                    size="sm"
                    className="capitalize text-xs"
                    onClick={() => updateSourcingStage(s)}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Screening Tab */}
        <TabsContent value="screening">
          <div className="space-y-4">
            {screeningRuns.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No screening runs yet. Run screening from the requisition page.</p>
                </CardContent>
              </Card>
            ) : (
              screeningRuns.map((run: any) => (
                <Card key={run.id}>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">Screening Run</CardTitle>
                    <Badge variant={run.result_band === "auto_pass" ? "default" : run.result_band === "reject" ? "destructive" : "secondary"} className="capitalize">
                      {run.result_band?.replace("_", " ")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Score</span>
                          <span className="text-lg font-bold">{run.total_score}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              run.total_score >= 80 ? "bg-success" : run.total_score >= 45 ? "bg-warning" : "bg-destructive"
                            }`}
                            style={{ width: `${run.total_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {run.knockout_failed && (
                      <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm font-medium text-destructive">⚠ Knockout rule failed — auto-rejected</p>
                      </div>
                    )}

                    {run.red_flags?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-warning">Red Flags:</p>
                        <div className="flex gap-1 flex-wrap">
                          {run.red_flags.map((f: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rule-by-rule breakdown */}
                    {run.screening_result_items?.length > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Rule Breakdown</p>
                        {run.screening_result_items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-xs py-1">
                            <span className={item.outcome === "pass" ? "text-success" : "text-destructive"}>
                              {item.outcome === "pass" ? "✓" : "✗"} {item.notes || "Rule check"}
                            </span>
                            <span className="text-muted-foreground">{item.points_awarded}pts</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="outreach">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Contact History</CardTitle>
              <Button size="sm" onClick={() => setOutreachDialog(true)}><Phone className="h-4 w-4 mr-2" />Log Contact</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {outreachLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No contact attempts logged</p>}
              {(outreachLogs as any[]).map((log: any) => (
                <div key={log.id} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.channel === "call" && <Phone className="h-4 w-4 text-muted-foreground" />}
                      {log.channel === "whatsapp" && <MessageCircle className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-medium capitalize">{log.channel}</span>
                    </div>
                    <Badge variant={
                      log.response_status === "interested" ? "default" :
                      log.response_status === "not_interested" ? "destructive" : "secondary"
                    } className="capitalize text-xs">{log.response_status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(log.contacted_at).toLocaleString()}</p>
                  {log.notes && <p className="text-sm">{log.notes}</p>}
                  {log.next_followup_date && (
                    <p className="text-xs text-muted-foreground">Follow-up: {log.next_followup_date}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Interview Rounds</CardTitle>
              <Button size="sm" onClick={() => setInterviewDialog(true)}>Schedule Interview</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {interviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No interviews scheduled</p>}
              {interviews.map((int: any) => (
                <div key={int.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Round {int.round_number}: {int.round_name}</p>
                      {int.scheduled_at && <p className="text-xs text-muted-foreground">{new Date(int.scheduled_at).toLocaleString()}</p>}
                    </div>
                    <Badge variant={int.status === "completed" ? "default" : "outline"} className="capitalize">{int.status}</Badge>
                  </div>
                  {int.status === "completed" && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">Score: {int.overall_score || "—"}</span>
                      <Badge variant={int.recommendation === "strong_yes" || int.recommendation === "yes" ? "default" : "destructive"} className="capitalize">
                        {int.recommendation?.replace("_", " ") || "—"}
                      </Badge>
                    </div>
                  )}
                  {int.status === "scheduled" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => completeInterview(int.id, "yes", 8)}>✓ Pass</Button>
                      <Button size="sm" variant="outline" onClick={() => completeInterview(int.id, "no", 4)}>✗ Fail</Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Verification Checklist</CardTitle>
              {verifications.length === 0 && <Button size="sm" onClick={initVerifications}><Shield className="h-4 w-4 mr-2" />Initialize Checklist</Button>}
            </CardHeader>
            <CardContent className="space-y-2">
              {verifications.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{v.verification_type}</p>
                    {v.verified_at && <p className="text-xs text-muted-foreground">Verified {new Date(v.verified_at).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.status === "verified" ? "default" : v.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                      {v.status.replace("_"," ")}
                    </Badge>
                    {v.status !== "verified" && (
                      <Button size="sm" variant="ghost" onClick={() => updateVerification(v.id, "verified")}>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Offers</CardTitle>
              <Button size="sm" onClick={() => setOfferDialog(true)}>Create Offer</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {offers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No offers yet</p>}
              {offers.map((o: any) => (
                <div key={o.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Version {o.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.designations?.title || "—"} · {o.departments?.name || "—"} · {o.branches?.name || "—"}
                      </p>
                    </div>
                    <Badge variant={o.status === "accepted" ? "default" : "outline"} className="capitalize">{o.status}</Badge>
                  </div>
                  {o.joining_date && <p className="text-xs text-muted-foreground">Joining: {o.joining_date}</p>}
                  {o.status === "sent" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => {
                        await supabase.from("offers").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", o.id);
                        queryClient.invalidateQueries({ queryKey: ["offers", id] });
                        moveStage("pre_boarding");
                      }}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        await supabase.from("offers").update({ status: "declined" }).eq("id", o.id);
                        queryClient.invalidateQueries({ queryKey: ["offers", id] });
                      }}>Decline</Button>
                    </div>
                  )}
                  {o.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from("offers").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", o.id);
                      queryClient.invalidateQueries({ queryKey: ["offers", id] });
                    }}>Mark as Sent</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Stage History</CardTitle></CardHeader>
            <CardContent>
              {stageHistory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No stage changes recorded</p>}
              <div className="space-y-3">
                {stageHistory.map((h: any) => (
                  <div key={h.id} className="flex items-center gap-3 p-2 border-l-2 border-primary/30 pl-4">
                    <div>
                      <p className="text-sm">
                        <span className="text-muted-foreground capitalize">{h.from_stage?.replace("_"," ") || "—"}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium capitalize">{h.to_stage.replace("_"," ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Interview Dialog */}
      <Dialog open={interviewDialog} onOpenChange={setInterviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Round Name *</Label><Input value={interviewForm.round_name} onChange={(e) => setInterviewForm({ ...interviewForm, round_name: e.target.value })} placeholder="e.g. Technical Round" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Round #</Label><Input type="number" min={1} value={interviewForm.round_number} onChange={(e) => setInterviewForm({ ...interviewForm, round_number: parseInt(e.target.value) || 1 })} /></div>
              <div><Label>Date & Time</Label><Input type="datetime-local" value={interviewForm.scheduled_at} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInterviewDialog(false)}>Cancel</Button>
              <Button onClick={handleScheduleInterview} disabled={savingInterview}>{savingInterview ? "Saving..." : "Schedule"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Select value={offerForm.department_id} onValueChange={(v) => setOfferForm({ ...offerForm, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Select value={offerForm.designation_id} onValueChange={(v) => setOfferForm({ ...offerForm, designation_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{designations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Branch</Label>
                <Select value={offerForm.branch_id} onValueChange={(v) => setOfferForm({ ...offerForm, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Joining Date</Label><Input type="date" value={offerForm.joining_date} onChange={(e) => setOfferForm({ ...offerForm, joining_date: e.target.value })} /></div>
            </div>
            <div><Label>Base Salary (₹)</Label><Input type="number" value={offerForm.base_salary} onChange={(e) => setOfferForm({ ...offerForm, base_salary: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOfferDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateOffer} disabled={savingOffer}>{savingOffer ? "Saving..." : "Create Offer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Outreach Dialog */}
      <Dialog open={outreachDialog} onOpenChange={setOutreachDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Contact Attempt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Channel</Label>
                <Select value={outreachForm.channel} onValueChange={(v) => setOutreachForm({ ...outreachForm, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{outreachChannels.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Response</Label>
                <Select value={outreachForm.response_status} onValueChange={(v) => setOutreachForm({ ...outreachForm, response_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{responseStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Interest Level (1-5)</Label><Input type="number" min={0} max={5} value={outreachForm.interest_level} onChange={(e) => setOutreachForm({ ...outreachForm, interest_level: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Notes</Label><Textarea value={outreachForm.notes} onChange={(e) => setOutreachForm({ ...outreachForm, notes: e.target.value })} placeholder="Conversation summary..." /></div>
            <div><Label>Next Follow-up Date</Label><Input type="date" value={outreachForm.next_followup_date} onChange={(e) => setOutreachForm({ ...outreachForm, next_followup_date: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOutreachDialog(false)}>Cancel</Button>
              <Button onClick={handleLogOutreach} disabled={savingOutreach}>{savingOutreach ? "Saving..." : "Log Contact"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
