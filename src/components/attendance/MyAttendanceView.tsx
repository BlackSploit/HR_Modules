import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { Calendar, Clock, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";

const statusStyleMap: Record<string, "active" | "warning" | "overdue" | "pending"> = {
  present: "active",
  late: "warning",
  absent: "overdue",
  half_day: "warning",
  on_leave: "pending",
  holiday: "pending",
};

export function MyAttendanceView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [regDate, setRegDate] = useState("");
  const [regClockIn, setRegClockIn] = useState("");
  const [regClockOut, setRegClockOut] = useState("");
  const [regReason, setRegReason] = useState("");

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);

  const { data: records } = useQuery({
    queryKey: ["my-monthly-attendance", myEmployee?.id, selectedMonth],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", myEmployee.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date");
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const { data: myRequests } = useQuery({
    queryKey: ["my-regularization-requests", myEmployee?.id],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data } = await supabase
        .from("regularization_requests")
        .select("*")
        .eq("employee_id", myEmployee.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!myEmployee?.id || !regDate || !regReason) throw new Error("Fill all required fields");
      const clockInTs = regClockIn ? new Date(`${regDate}T${regClockIn}`).toISOString() : null;
      const clockOutTs = regClockOut ? new Date(`${regDate}T${regClockOut}`).toISOString() : null;

      const { error } = await supabase.from("regularization_requests").insert({
        employee_id: myEmployee.id,
        date: regDate,
        requested_clock_in: clockInTs,
        requested_clock_out: clockOutTs,
        reason: regReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regularization request submitted");
      queryClient.invalidateQueries({ queryKey: ["my-regularization-requests"] });
      setRegDialogOpen(false);
      setRegDate("");
      setRegClockIn("");
      setRegClockOut("");
      setRegReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const recordMap = new Map<string, any>();
  records?.forEach((r) => recordMap.set(r.date, r));

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const stats = {
    present: records?.filter((r) => r.status === "present" || r.status === "late").length || 0,
    late: records?.filter((r) => r.status === "late").length || 0,
    absent: records?.filter((r) => r.status === "absent").length || 0,
    totalHours: records?.reduce((sum, r) => sum + (r.worked_hours || 0), 0) || 0,
    overtime: records?.reduce((sum, r) => sum + (r.overtime_hours || 0), 0) || 0,
  };

  const statusColorMap: Record<string, string> = {
    present: "bg-green-500",
    late: "bg-yellow-500",
    absent: "bg-red-500",
    half_day: "bg-orange-400",
    on_leave: "bg-blue-400",
    holiday: "bg-purple-400",
  };

  if (!myEmployee) {
    return <Card><CardContent><EmptyState icon={Calendar} title="No employee record" description="Your account is not linked to an employee record." /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Month selector + stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-48" />
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setRegDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Request Regularization
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Present", value: stats.present, color: "text-green-600" },
          { label: "Late", value: stats.late, color: "text-yellow-600" },
          { label: "Absent", value: stats.absent, color: "text-destructive" },
          { label: "Total Hours", value: `${stats.totalHours.toFixed(1)}h`, color: "text-foreground" },
          { label: "Overtime", value: `${stats.overtime.toFixed(1)}h`, color: "text-yellow-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-1">{d}</div>
            ))}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const record = recordMap.get(dateStr);
              const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
              return (
                <div
                  key={dateStr}
                  className={`relative text-center p-1 rounded text-xs ${isToday ? "ring-1 ring-primary" : ""}`}
                >
                  <span className="text-muted-foreground">{format(day, "d")}</span>
                  {record && (
                    <div className="flex items-center justify-center gap-0.5">
                      <div className={`w-2 h-2 rounded-full ${statusColorMap[record.status] || "bg-muted"}`} title={record.status} />
                      {record.geo_lat && record.geo_lng && (
                        <MapPin className="h-2 w-2 text-primary" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
            {Object.entries(statusColorMap).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="capitalize">{status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regularization requests */}
      {myRequests && myRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Regularization Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRequests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                <div>
                  <span className="font-medium">{format(new Date(req.date), "MMM d, yyyy")}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{req.reason}</span>
                </div>
                <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {req.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Regularization dialog */}
      <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Regularization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Correct Clock In</Label>
                <Input type="time" value={regClockIn} onChange={(e) => setRegClockIn(e.target.value)} />
              </div>
              <div>
                <Label>Correct Clock Out</Label>
                <Input type="time" value={regClockOut} onChange={(e) => setRegClockOut(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea value={regReason} onChange={(e) => setRegReason(e.target.value)} placeholder="Why do you need a correction?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => submitRequest.mutate()} disabled={!regDate || !regReason || submitRequest.isPending}>
              {submitRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
