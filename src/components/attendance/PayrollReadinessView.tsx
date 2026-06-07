import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Lock, Download, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

export function PayrollReadinessView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");
  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter((d) => !isWeekend(d)).length;

  const { data: payrollPeriod } = useQuery({
    queryKey: ["payroll-period", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("start_date", startStr)
        .eq("end_date", endStr)
        .maybeSingle();
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["all-active-employees-payroll"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, first_name, last_name, departments(name)").eq("status", "active").order("first_name");
      return data || [];
    },
  });

  const { data: records } = useQuery({
    queryKey: ["payroll-attendance", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, status, worked_hours, overtime_hours")
        .gte("date", startStr)
        .lte("date", endStr);
      return data || [];
    },
  });

  const { data: exceptions } = useQuery({
    queryKey: ["payroll-exceptions", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_exceptions")
        .select("employee_id, status")
        .eq("status", "open")
        .gte("created_at", new Date(startStr).toISOString());
      return data || [];
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (payrollPeriod) {
        const { error } = await supabase.from("payroll_periods").update({ status: "locked", locked_by: user?.id, locked_at: new Date().toISOString() }).eq("id", payrollPeriod.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_periods").insert({ start_date: startStr, end_date: endStr, status: "locked", locked_by: user?.id, locked_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Period locked");
      queryClient.invalidateQueries({ queryKey: ["payroll-period"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Per-employee aggregation
  const empStats = new Map<string, { present: number; absent: number; leave: number; late: number; hours: number; overtime: number; openExceptions: number }>();
  employees?.forEach((e) => empStats.set(e.id, { present: 0, absent: 0, leave: 0, late: 0, hours: 0, overtime: 0, openExceptions: 0 }));
  records?.forEach((r: any) => {
    const s = empStats.get(r.employee_id);
    if (!s) return;
    if (r.status === "present") s.present++;
    else if (r.status === "absent") s.absent++;
    else if (r.status === "on_leave") s.leave++;
    else if (r.status === "late") { s.late++; s.present++; }
    s.hours += r.worked_hours || 0;
    s.overtime += r.overtime_hours || 0;
  });
  exceptions?.forEach((ex: any) => {
    const s = empStats.get(ex.employee_id);
    if (s) s.openExceptions++;
  });

  function exportPayrollCSV() {
    if (!employees?.length) return;
    const header = ["Employee", "Department", "Working Days", "Present", "Absent", "Leave", "Late", "Hours", "Overtime", "Open Exceptions"];
    const rows = employees.map((e) => {
      const s = empStats.get(e.id)!;
      return [
        `${e.first_name} ${e.last_name}`, e.departments?.name || "—", workingDays,
        s.present, s.absent, s.leave, s.late, s.hours.toFixed(1), s.overtime.toFixed(1), s.openExceptions,
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isLocked = payrollPeriod?.status === "locked" || payrollPeriod?.status === "exported";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-48" />
        <div className="flex gap-2">
          {isLocked ? (
            <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Period Locked</Badge>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending}>
              <Lock className="h-4 w-4" /> Lock Period
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={exportPayrollCSV}>
            <Download className="h-4 w-4" /> Export Payroll CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{employees?.length || 0}</p><p className="text-[11px] text-muted-foreground">Employees</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{workingDays}</p><p className="text-[11px] text-muted-foreground">Working Days</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-600">{exceptions?.length || 0}</p><p className="text-[11px] text-muted-foreground">Open Exceptions</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{isLocked ? "Locked" : "Open"}</p><p className="text-[11px] text-muted-foreground">Period Status</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Dept</TableHead>
                <TableHead className="text-xs">Present</TableHead>
                <TableHead className="text-xs">Absent</TableHead>
                <TableHead className="text-xs">Leave</TableHead>
                <TableHead className="text-xs">Late</TableHead>
                <TableHead className="text-xs">Hours</TableHead>
                <TableHead className="text-xs">OT</TableHead>
                <TableHead className="text-xs">Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((e) => {
                const s = empStats.get(e.id)!;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-medium">{e.first_name} {e.last_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.departments?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{s.present}</TableCell>
                    <TableCell className="text-xs">{s.absent > 0 ? <span className="text-destructive">{s.absent}</span> : "0"}</TableCell>
                    <TableCell className="text-xs">{s.leave}</TableCell>
                    <TableCell className="text-xs">{s.late > 0 ? <span className="text-yellow-600">{s.late}</span> : "0"}</TableCell>
                    <TableCell className="text-xs">{s.hours.toFixed(1)}</TableCell>
                    <TableCell className="text-xs">{s.overtime > 0 ? <span className="text-yellow-600">{s.overtime.toFixed(1)}</span> : "0"}</TableCell>
                    <TableCell className="text-xs">
                      {s.openExceptions > 0 ? <Badge variant="destructive" className="text-[10px]">{s.openExceptions}</Badge> : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
