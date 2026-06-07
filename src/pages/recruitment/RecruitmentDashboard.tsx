import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Briefcase, Calendar, FileCheck, AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RecruitmentDashboard() {
  const navigate = useNavigate();

  const { data: requisitions = [] } = useQuery({
    queryKey: ["job_requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_requisitions")
        .select("*, departments(name), designations(title), branches(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["interview_rounds_week"],
    queryFn: async () => {
      const today = new Date();
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const { data, error } = await supabase
        .from("interview_rounds")
        .select("*, candidates(first_name, last_name), job_requisitions(title)")
        .gte("scheduled_at", today.toISOString())
        .lte("scheduled_at", weekEnd.toISOString())
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["offers_pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, candidates(first_name, last_name)")
        .in("status", ["draft", "pending_approval", "sent"]);
      if (error) throw error;
      return data;
    },
  });

  const pendingApproval = requisitions.filter((r: any) => r.status === "pending_approval");
  const openRequisitions = requisitions.filter((r: any) => ["approved", "sourcing"].includes(r.status));
  const allActive = requisitions.filter((r: any) => !["closed", "cancelled", "on_hold"].includes(r.status));

  const stats = [
    { label: "Open Positions", value: openRequisitions.length, icon: Briefcase, color: "text-blue-600 bg-blue-50" },
    { label: "Pending Approval", value: pendingApproval.length, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Interviews This Week", value: interviews.length, icon: Calendar, color: "text-purple-600 bg-purple-50" },
    { label: "Pending Offers", value: offers.length, icon: FileCheck, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruitment</h1>
          <p className="text-sm text-muted-foreground">Manage hiring pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/people/recruitment/candidates")}><Users className="h-4 w-4 mr-2" />Candidates</Button>
          <Button onClick={() => navigate("/people/recruitment/requisitions/new")}><Plus className="h-4 w-4 mr-2" />New Requisition</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Needs Your Attention */}
      {(pendingApproval.length > 0 || interviews.length > 0 || offers.length > 0) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Needs Your Attention</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {/* Pending Approvals */}
            {pendingApproval.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Requisitions Pending Approval</p>
                <div className="space-y-1">
                  {pendingApproval.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => navigate(`/people/recruitment/requisitions/${r.id}`)}>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.departments?.name} · {r.branches?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.urgency === "critical" ? "destructive" : "secondary"} className="capitalize text-xs">{r.urgency}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Interviews */}
            {interviews.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Upcoming Interviews</p>
                <div className="space-y-1">
                  {interviews.slice(0, 5).map((ir: any) => (
                    <div key={ir.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{ir.candidates?.first_name} {ir.candidates?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{ir.round_name} · {new Date(ir.scheduled_at).toLocaleDateString()} {new Date(ir.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{(ir as any).job_requisitions?.title || "—"}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Offers */}
            {offers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Pending Offers</p>
                <div className="space-y-1">
                  {offers.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                      <p className="text-sm font-medium">{o.candidates?.first_name} {o.candidates?.last_name}</p>
                      <Badge variant="secondary" className="capitalize text-xs">{o.status.replace("_", " ")}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Requisitions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">All Requisitions ({allActive.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/people/recruitment/requisitions")}>View All</Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {allActive.slice(0, 10).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-2.5 hover:bg-muted rounded-lg cursor-pointer"
              onClick={() => navigate(`/people/recruitment/requisitions/${r.id}`)}>
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.departments?.name} · {r.branches?.name} · {r.headcount} headcount</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "approved" || r.status === "sourcing" ? "default" : r.status === "pending_approval" ? "secondary" : "outline"} className="capitalize text-xs">{r.status.replace("_", " ")}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
          {allActive.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No requisitions yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}
