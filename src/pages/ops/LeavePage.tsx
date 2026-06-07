import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, FileText, CheckCircle2, XCircle, Download, ExternalLink, Ban, TrendingDown, ShieldAlert, Briefcase, Settings2, ClipboardList } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { LeaveRequestDialog } from "@/components/leave/LeaveRequestDialog";
import { RejectReasonDialog } from "@/components/leave/RejectReasonDialog";
import { TeamBalancesView } from "@/components/leave/TeamBalancesView";
import { LeaveCalendarView } from "@/components/leave/LeaveCalendarView";
import { LeaveForecastingView } from "@/components/leave/LeaveForecastingView";
import { LeaveOverrideQueue } from "@/components/leave/LeaveOverrideQueue";
import { LeaveOfAbsenceManager } from "@/components/leave/LeaveOfAbsenceManager";
import { LeavePolicySettings } from "@/components/leave/LeavePolicySettings";
import { LeaveAuditLog } from "@/components/leave/LeaveAuditLog";
import { CoverageWarningBanner } from "@/components/leave/CoverageWarningBanner";

const leaveStatusMap: Record<string, "active" | "warning" | "overdue" | "pending"> = {
  pending: "pending",
  approved: "active",
  rejected: "overdue",
  cancelled: "warning",
};

export default function LeavePage() {
  const { user, isAdminOrHR } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [showRequest, setShowRequest] = useState(false);
  const [activeTab, setActiveTab] = useState(isAdminOrHR ? "requests" : "my-leaves");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  // Filters for All Requests
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: myBalances } = useQuery({
    queryKey: ["my-leave-balances", myEmployee?.id],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data } = await supabase
        .from("leave_balances")
        .select("*, leave_types(name, code)")
        .eq("employee_id", myEmployee.id)
        .eq("year", new Date().getFullYear());
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const { data: myRequests, isLoading: myLoading } = useQuery({
    queryKey: ["my-leave-requests", myEmployee?.id],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data } = await supabase
        .from("leave_requests")
        .select("*, leave_types(name, code)")
        .eq("employee_id", myEmployee.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const { data: allRequests, isLoading: allLoading } = useQuery({
    queryKey: ["all-leave-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, leave_types(name, code), employees(first_name, last_name, departments(name))")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdminOrHR,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
    enabled: isAdminOrHR,
  });

  // Filter all requests
  const filteredRequests = allRequests?.filter((r: any) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (deptFilter !== "all" && r.employees?.departments?.name !== deptFilter) return false;
    if (searchTerm) {
      const name = `${r.employees?.first_name} ${r.employees?.last_name}`.toLowerCase();
      if (!name.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const pendingCount = allRequests?.filter((r: any) => r.status === "pending").length || 0;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const updateData: any = {
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };
      if (rejectionReason) updateData.rejection_reason = rejectionReason;

      const { error } = await supabase.from("leave_requests").update(updateData).eq("id", id);
      if (error) throw error;

      // Auto-deduct/reverse balance
      const request = allRequests?.find((r: any) => r.id === id);
      if (!request) return;

      if (status === "approved") {
        // Deduct balance
        const { data: bal } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("employee_id", request.employee_id)
          .eq("leave_type_id", request.leave_type_id)
          .eq("year", new Date(request.start_date).getFullYear())
          .single();
        if (bal) {
          await supabase.from("leave_balances").update({
            used_days: Number(bal.used_days) + Number(request.total_days),
          }).eq("id", bal.id);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Leave request updated" });
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["all-leave-balances"] });
      setRejectTarget(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelLeave = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", request.id);
      if (error) throw error;

      // Reverse balance if was approved
      if (request.status === "approved") {
        const { data: bal } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("employee_id", request.employee_id)
          .eq("leave_type_id", request.leave_type_id)
          .eq("year", new Date(request.start_date).getFullYear())
          .single();
        if (bal) {
          await supabase.from("leave_balances").update({
            used_days: Math.max(0, Number(bal.used_days) - Number(request.total_days)),
          }).eq("id", bal.id);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Leave cancelled" });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const exportCsv = () => {
    if (!filteredRequests?.length) return;
    const headers = ["Employee", "Department", "Leave Type", "Start", "End", "Days", "Half Day", "Status", "Reason", "Rejection Reason"];
    const rows = filteredRequests.map((r: any) => [
      `${r.employees?.first_name} ${r.employees?.last_name}`,
      r.employees?.departments?.name || "",
      r.leave_types?.name || "",
      r.start_date,
      r.end_date,
      r.total_days,
      r.half_day || "Full Day",
      r.status,
      r.reason || "",
      r.rejection_reason || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-requests-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRequestCard = (r: any, showEmployee = false, canCancel = false) => (
    <Card key={r.id}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {showEmployee && (
              <p className="text-sm font-semibold">{r.employees?.first_name} {r.employees?.last_name}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{r.leave_types?.code}</Badge>
              {r.half_day && <Badge variant="secondary" className="text-[10px]">{r.half_day === "first_half" ? "1st Half" : "2nd Half"}</Badge>}
              <StatusChip status={leaveStatusMap[r.status] || "pending"} label={r.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(r.start_date), "MMM d")} – {format(new Date(r.end_date), "MMM d, yyyy")} ({r.total_days}d)
            </p>
            {r.reason && <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>}
            {r.rejection_reason && (
              <p className="text-xs text-destructive mt-1">Rejected: {r.rejection_reason}</p>
            )}
            {r.document_url && (
              <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
                <ExternalLink className="h-3 w-3" /> View Document
              </a>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {canCancel && (r.status === "pending" || r.status === "approved") && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => cancelLeave.mutate(r)} title="Cancel">
                <Ban className="h-4 w-4" />
              </Button>
            )}
            {isAdminOrHR && r.status === "pending" && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setRejectTarget(r.id)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-sm text-muted-foreground">Request and manage leaves</p>
        </div>
        {myEmployee && (
          <Button onClick={() => setShowRequest(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Request Leave
          </Button>
        )}
      </div>

      {/* Balances */}
      {myBalances && myBalances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {myBalances.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-3 text-center">
                <p className={`text-lg font-bold ${(b.total_days - Number(b.used_days)) <= 0 ? "text-destructive" : "text-primary"}`}>
                  {b.total_days - Number(b.used_days)}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.leave_types?.code}</p>
                <p className="text-[10px] text-muted-foreground">{b.used_days}/{b.total_days} used</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
          {isAdminOrHR && (
            <TabsTrigger value="requests" className="gap-1">
              All Requests {pendingCount > 0 && <Badge variant="destructive" className="h-5 min-w-[20px] text-[10px]">{pendingCount}</Badge>}
            </TabsTrigger>
          )}
          {isAdminOrHR && <TabsTrigger value="team-balances">Team Balances</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="calendar">Calendar</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="planning" className="gap-1"><TrendingDown className="h-3.5 w-3.5" /> Planning</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="overrides" className="gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Overrides</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="loa" className="gap-1"><Briefcase className="h-3.5 w-3.5" /> Long Absence</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="policies" className="gap-1"><Settings2 className="h-3.5 w-3.5" /> Policies</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="audit" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> Audit Log</TabsTrigger>}
        </TabsList>

        {/* My Leaves */}
        <TabsContent value="my-leaves" className="space-y-2 mt-4">
          {myLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : myRequests?.length ? (
            myRequests.map((r: any) => renderRequestCard(r, false, true))
          ) : (
            <Card><CardContent><EmptyState icon={FileText} title="No leave requests" description="You haven't submitted any leave requests yet." /></CardContent></Card>
          )}
        </TabsContent>

        {/* All Requests (HR) */}
        {isAdminOrHR && (
          <TabsContent value="requests" className="space-y-3 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-[200px]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>

            {allLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : filteredRequests?.length ? (
              isMobile ? (
                filteredRequests.map((r: any) => renderRequestCard(r, true))
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</p>
                                <p className="text-xs text-muted-foreground">{r.employees?.departments?.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">{r.leave_types?.name}</Badge>
                                {r.half_day && <Badge variant="secondary" className="text-[10px]">{r.half_day === "first_half" ? "1H" : "2H"}</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{format(new Date(r.start_date), "MMM d")} – {format(new Date(r.end_date), "MMM d")}</TableCell>
                            <TableCell>{r.total_days}</TableCell>
                            <TableCell>
                              <StatusChip status={leaveStatusMap[r.status] || "pending"} label={r.status} />
                              {r.rejection_reason && <p className="text-[10px] text-destructive mt-0.5">{r.rejection_reason}</p>}
                            </TableCell>
                            <TableCell>
                              {r.document_url && (
                                <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs">View</a>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="text-success hover:text-success h-7" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7" onClick={() => setRejectTarget(r.id)}>
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card><CardContent><EmptyState icon={FileText} title="No requests" description="No leave requests match your filters." /></CardContent></Card>
            )}
          </TabsContent>
        )}

        {/* Team Balances */}
        {isAdminOrHR && (
          <TabsContent value="team-balances" className="mt-4">
            <TeamBalancesView />
          </TabsContent>
        )}

        {/* Planning */}
        {isAdminOrHR && (
          <TabsContent value="planning" className="mt-4">
            <LeaveForecastingView />
          </TabsContent>
        )}

        {/* Overrides */}
        {isAdminOrHR && (
          <TabsContent value="overrides" className="mt-4">
            <LeaveOverrideQueue />
          </TabsContent>
        )}

        {/* Long Absence */}
        {isAdminOrHR && (
          <TabsContent value="loa" className="mt-4">
            <LeaveOfAbsenceManager />
          </TabsContent>
        )}

        {/* Policies */}
        {isAdminOrHR && (
          <TabsContent value="policies" className="mt-4">
            <LeavePolicySettings />
          </TabsContent>
        )}

        {/* Audit Log */}
        {isAdminOrHR && (
          <TabsContent value="audit" className="mt-4">
            <LeaveAuditLog />
          </TabsContent>
        )}
        {isAdminOrHR && (
          <TabsContent value="calendar" className="mt-4">
            <LeaveCalendarView />
          </TabsContent>
        )}
      </Tabs>

      {/* Request Dialog */}
      {myEmployee && (
        <LeaveRequestDialog
          open={showRequest}
          onOpenChange={setShowRequest}
          employeeId={myEmployee.id}
          leaveTypes={leaveTypes || []}
          balances={myBalances || []}
        />
      )}

      {/* Reject Reason Dialog */}
      <RejectReasonDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        isPending={updateStatus.isPending}
        onConfirm={(reason) => {
          if (rejectTarget) {
            updateStatus.mutate({ id: rejectTarget, status: "rejected", rejectionReason: reason });
          }
        }}
      />
    </div>
  );
}
