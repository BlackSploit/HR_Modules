import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, AlertTriangle, Clock, CheckCircle, Search, ArrowRight,
  UserPlus, Shield, ClipboardList, Briefcase, Info, X
} from "lucide-react";
import ConvertToEmployeeDialog from "@/components/onboarding/ConvertToEmployeeDialog";

const STAGE_LABELS: Record<string, string> = {
  offer_accepted: "Offer Accepted",
  preboarding: "Pre-boarding",
  joining_review: "Joining Review",
  day1_orientation: "Day 1",
  dept_induction: "Dept Induction",
  role_induction: "Role Induction",
  supervised_practice: "Supervised Practice",
  competency_signoff: "Competency",
  deployment_clearance: "Clearance",
  integration_30_60_90: "Integration",
  completed: "Completed",
};

const STAGE_ORDER = Object.keys(STAGE_LABELS);

const STAGE_COLORS: Record<string, string> = {
  offer_accepted: "bg-blue-100 text-blue-700",
  preboarding: "bg-amber-100 text-amber-700",
  joining_review: "bg-orange-100 text-orange-700",
  day1_orientation: "bg-purple-100 text-purple-700",
  dept_induction: "bg-indigo-100 text-indigo-700",
  role_induction: "bg-cyan-100 text-cyan-700",
  supervised_practice: "bg-teal-100 text-teal-700",
  competency_signoff: "bg-emerald-100 text-emerald-700",
  deployment_clearance: "bg-green-100 text-green-700",
  integration_30_60_90: "bg-lime-100 text-lime-700",
  completed: "bg-muted text-muted-foreground",
};

const OWNER_ROLE_LABELS: Record<string, string> = {
  hr: "HR",
  manager: "Manager",
  trainer: "Trainer",
  it: "IT",
  admin: "Admin",
  buddy: "Buddy",
  employee: "Employee",
};

type SpecialFilter = "blocked" | "overdue" | "upcoming" | null;

export default function OnboardingDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [centerFilter, setCenterFilter] = useState<string>("all");
  const [roleFamilyFilter, setRoleFamilyFilter] = useState<string>("all");
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>(null);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["onboarding_cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_cases")
        .select("*, employees!onboarding_cases_employee_id_fkey(first_name, last_name, email, phone), branches(name), departments(name), designations(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["onboarding_tasks_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .select("id, case_id, status, due_date, owner_role, is_mandatory");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches_list"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  // Accepted offers without onboarding cases (fallback)
  const { data: pendingOffers = [] } = useQuery({
    queryKey: ["accepted_offers_no_onboarding"],
    queryFn: async () => {
      const { data: acceptedOffers } = await supabase
        .from("offers")
        .select("id, candidate_id, joining_date, requisition_id, branch_id, department_id, designation_id, candidates(id, first_name, last_name, phone, email, profession_category), job_requisitions(title, category)")
        .eq("status", "accepted");
      if (!acceptedOffers || acceptedOffers.length === 0) return [];
      const candidateIds = acceptedOffers.map((o: any) => o.candidate_id).filter(Boolean);
      const { data: existingCases } = await supabase
        .from("onboarding_cases")
        .select("candidate_id")
        .in("candidate_id", candidateIds);
      const coveredIds = new Set((existingCases || []).map((c: any) => c.candidate_id));
      return acceptedOffers.filter((o: any) => !coveredIds.has(o.candidate_id));
    },
  });

  const [convertCandidate, setConvertCandidate] = useState<any>(null);
  const [convertOffer, setConvertOffer] = useState<any>(null);

  // Pipeline counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGE_ORDER.forEach(s => counts[s] = 0);
    cases.forEach((c: any) => {
      if (counts[c.current_stage] !== undefined) counts[c.current_stage]++;
    });
    return counts;
  }, [cases]);

  // Attention items with case IDs for filtering
  const attentionData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const threeDaysOut = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    const overdueTasks = tasks.filter((t: any) => t.status === "pending" && t.due_date && t.due_date < today);
    const overdueCaseIds = new Set(overdueTasks.map((t: any) => t.case_id));
    const blockedCaseIds = new Set(tasks.filter((t: any) => t.status === "blocked").map((t: any) => t.case_id));
    const upcomingJoinerIds = new Set(
      cases.filter((c: any) =>
        c.joining_date && c.joining_date >= today && c.joining_date <= threeDaysOut && c.current_stage !== "completed"
      ).map((c: any) => c.id)
    );

    return {
      overdueTasks: overdueTasks.length,
      blockedCases: blockedCaseIds.size,
      upcomingJoiners: upcomingJoinerIds.size,
      overdueCaseIds,
      blockedCaseIds,
      upcomingJoinerIds,
    };
  }, [cases, tasks]);

  // Pending by owner
  const pendingByOwner = useMemo(() => {
    const counts: Record<string, { count: number; caseIds: Set<string> }> = {};
    tasks.forEach((t: any) => {
      if (t.status === "pending" && t.owner_role) {
        if (!counts[t.owner_role]) counts[t.owner_role] = { count: 0, caseIds: new Set() };
        counts[t.owner_role].count++;
        counts[t.owner_role].caseIds.add(t.case_id);
      }
    });
    return counts;
  }, [tasks]);

  // Role families for filter
  const roleFamilies = useMemo(() => {
    const families = new Set<string>();
    cases.forEach((c: any) => { if (c.role_family) families.add(c.role_family); });
    return Array.from(families).sort();
  }, [cases]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter((c: any) => {
      // Special filters
      if (specialFilter === "blocked" && !attentionData.blockedCaseIds.has(c.id)) return false;
      if (specialFilter === "overdue" && !attentionData.overdueCaseIds.has(c.id)) return false;
      if (specialFilter === "upcoming" && !attentionData.upcomingJoinerIds.has(c.id)) return false;

      // Owner filter
      if (ownerFilter) {
        const ownerData = pendingByOwner[ownerFilter];
        if (!ownerData || !ownerData.caseIds.has(c.id)) return false;
      }

      if (stageFilter !== "all" && c.current_stage !== stageFilter) return false;
      if (centerFilter !== "all" && c.branch_id !== centerFilter) return false;
      if (roleFamilyFilter !== "all" && c.role_family !== roleFamilyFilter) return false;
      if (search) {
        const name = `${c.employees?.first_name || ""} ${c.employees?.last_name || ""}`.toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [cases, stageFilter, centerFilter, roleFamilyFilter, search, specialFilter, ownerFilter, attentionData, pendingByOwner]);

  const activeCases = cases.filter((c: any) => c.current_stage !== "completed");

  const clearAllFilters = () => {
    setStageFilter("all");
    setSpecialFilter(null);
    setOwnerFilter(null);
    setRoleFamilyFilter("all");
    setCenterFilter("all");
    setSearch("");
  };

  const hasActiveFilters = stageFilter !== "all" || specialFilter || ownerFilter || roleFamilyFilter !== "all" || centerFilter !== "all" || search;

  const getDaysBadgeClass = (joiningDate: string | null, currentStage: string) => {
    if (!joiningDate || currentStage === "completed") return "text-muted-foreground";
    const days = Math.floor((Date.now() - new Date(joiningDate).getTime()) / 86400000);
    if (days < 0) return "text-blue-600 bg-blue-50";
    if (days <= 7) return "text-green-700 bg-green-50";
    if (days <= 30) return "text-amber-700 bg-amber-50";
    return "text-destructive bg-destructive/10";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Onboarding Control Tower</h1>
          <p className="text-sm text-muted-foreground">{activeCases.length} active onboarding cases</p>
        </div>
        <Button onClick={() => navigate("/people/onboarding/templates")} variant="outline">
          <ClipboardList className="h-4 w-4 mr-2" />Templates
        </Button>
      </div>

      {/* Attention Cards — now clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCases.length}</p>
              <p className="text-xs text-muted-foreground">Active Cases</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${specialFilter === "blocked" ? "ring-2 ring-destructive" : ""} ${attentionData.blockedCases > 0 ? "border-l-destructive" : "border-l-muted"}`}
          onClick={() => { setSpecialFilter(specialFilter === "blocked" ? null : "blocked"); setStageFilter("all"); setOwnerFilter(null); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${attentionData.blockedCases > 0 ? "bg-destructive/10" : "bg-muted"}`}>
              <Shield className={`h-5 w-5 ${attentionData.blockedCases > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{attentionData.blockedCases}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${specialFilter === "overdue" ? "ring-2 ring-amber-500" : ""} ${attentionData.overdueTasks > 0 ? "border-l-amber-500" : "border-l-muted"}`}
          onClick={() => { setSpecialFilter(specialFilter === "overdue" ? null : "overdue"); setStageFilter("all"); setOwnerFilter(null); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${attentionData.overdueTasks > 0 ? "bg-amber-100" : "bg-muted"}`}>
              <AlertTriangle className={`h-5 w-5 ${attentionData.overdueTasks > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{attentionData.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${specialFilter === "upcoming" ? "ring-2 ring-blue-500" : ""} ${attentionData.upcomingJoiners > 0 ? "border-l-blue-500" : "border-l-muted"}`}
          onClick={() => { setSpecialFilter(specialFilter === "upcoming" ? null : "upcoming"); setStageFilter("all"); setOwnerFilter(null); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${attentionData.upcomingJoiners > 0 ? "bg-blue-100" : "bg-muted"}`}>
              <Clock className={`h-5 w-5 ${attentionData.upcomingJoiners > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{attentionData.upcomingJoiners}</p>
              <p className="text-xs text-muted-foreground">Joining in 3 days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending by Owner Widget */}
      {Object.keys(pendingByOwner).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Tasks by Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(pendingByOwner).map(([role, data]) => (
                <button
                  key={role}
                  onClick={() => {
                    setOwnerFilter(ownerFilter === role ? null : role);
                    setSpecialFilter(null);
                    setStageFilter("all");
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
                    ${ownerFilter === role ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                  `}
                >
                  <span className="font-medium">{OWNER_ROLE_LABELS[role] || role}</span>
                  <Badge variant={data.count > 5 ? "destructive" : "secondary"} className="text-xs h-5">
                    {data.count} tasks · {data.caseIds.size} hires
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Onboarding Setup Banner */}
      {pendingOffers.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm text-amber-800">
              <strong>{pendingOffers.length}</strong> candidate{pendingOffers.length > 1 ? "s" : ""} accepted offer{pendingOffers.length > 1 ? "s" : ""} but {pendingOffers.length > 1 ? "don't" : "doesn't"} have onboarding cases yet.
            </span>
            <div className="flex gap-2 ml-4 flex-shrink-0">
              {pendingOffers.map((o: any) => (
                <Button
                  key={o.id}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 hover:bg-amber-100"
                  onClick={() => {
                    setConvertCandidate(o.candidates);
                    setConvertOffer(o);
                  }}
                >
                  Set Up {o.candidates?.first_name} {o.candidates?.last_name}
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {convertCandidate && (
        <ConvertToEmployeeDialog
          open={!!convertCandidate}
          onOpenChange={(open) => { if (!open) { setConvertCandidate(null); setConvertOffer(null); } }}
          candidate={convertCandidate}
          offer={convertOffer}
        />
      )}

      {/* Pipeline Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Onboarding Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {STAGE_ORDER.filter(s => s !== "completed").map(stage => {
              const count = stageCounts[stage] || 0;
              const isActive = stageFilter === stage;
              return (
                <button
                  key={stage}
                  onClick={() => { setStageFilter(isActive ? "all" : stage); setSpecialFilter(null); setOwnerFilter(null); }}
                  className={`flex-1 min-w-[80px] rounded-lg p-2 text-center transition-all border ${isActive ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50"} ${STAGE_COLORS[stage] || "bg-muted"}`}
                >
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] font-medium leading-tight">{STAGE_LABELS[stage]}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                New Hires
              </CardTitle>
              {hasActiveFilters && (
                <div className="flex items-center gap-1 flex-wrap">
                  {stageFilter !== "all" && <Badge variant="secondary" className="text-xs capitalize">{STAGE_LABELS[stageFilter]}</Badge>}
                  {specialFilter && <Badge variant="secondary" className="text-xs capitalize">{specialFilter}</Badge>}
                  {ownerFilter && <Badge variant="secondary" className="text-xs">{OWNER_ROLE_LABELS[ownerFilter] || ownerFilter} pending</Badge>}
                  {roleFamilyFilter !== "all" && <Badge variant="secondary" className="text-xs">{roleFamilyFilter}</Badge>}
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={clearAllFilters}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Search name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-48" />
              </div>
              {roleFamilies.length > 0 && (
                <Select value={roleFamilyFilter} onValueChange={(v) => { setRoleFamilyFilter(v); setSpecialFilter(null); setOwnerFilter(null); }}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Role Families</SelectItem>
                    {roleFamilies.map(rf => <SelectItem key={rf} value={rf}>{rf}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Centers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No onboarding cases found</p>
              <p className="text-xs text-muted-foreground mt-1">Convert hired candidates from the recruitment pipeline to start onboarding</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Joining</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((c: any) => {
                    const daysElapsed = c.joining_date
                      ? Math.floor((Date.now() - new Date(c.joining_date).getTime()) / 86400000)
                      : null;
                    const daysBadgeClass = getDaysBadgeClass(c.joining_date, c.current_stage);
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/people/onboarding/${c.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{c.employees?.first_name} {c.employees?.last_name}</p>
                            <p className="text-xs text-muted-foreground">{c.role_family || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{c.designations?.title || "—"}</TableCell>
                        <TableCell className="text-sm">{c.branches?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize ${STAGE_COLORS[c.current_stage] || ""}`}>
                            {STAGE_LABELS[c.current_stage] || c.current_stage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={c.readiness_score} className="h-2 w-16" />
                            <span className="text-xs font-medium">{c.readiness_score}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {c.joining_date || "TBD"}
                            {daysElapsed !== null && (
                              <span className={`text-[10px] font-semibold ml-1.5 px-1.5 py-0.5 rounded ${daysBadgeClass}`}>
                                {daysElapsed < 0 ? `in ${Math.abs(daysElapsed)}d` : `Day ${daysElapsed}`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
