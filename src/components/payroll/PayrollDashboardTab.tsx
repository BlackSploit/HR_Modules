import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DollarSign, Users, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { LivePayrollPreview } from "./LivePayrollPreview";

export function PayrollDashboardTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");
  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d)).length;

  const { data: employees } = useQuery({
    queryKey: ["payroll-dash-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id").eq("status", "active");
      return data || [];
    },
  });

  const { data: salaryStructures } = useQuery({
    queryKey: ["payroll-dash-structures"],
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_structures").select("employee_id, basic_pay, hra, da, special_allowance, gross_salary").eq("is_active", true);
      return data || [];
    },
  });

  const { data: exceptions } = useQuery({
    queryKey: ["payroll-dash-exceptions", startStr],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_exceptions").select("id").eq("status", "open");
      return data || [];
    },
  });

  const { data: pendingRegs } = useQuery({
    queryKey: ["payroll-dash-regs", startStr],
    queryFn: async () => {
      const { data } = await supabase.from("regularization_requests").select("id").eq("status", "pending");
      return data || [];
    },
  });

  const { data: payrollExceptions } = useQuery({
    queryKey: ["payroll-dash-payroll-exceptions"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_exceptions" as any).select("id").eq("status", "open");
      return (data as any[]) || [];
    },
  });

  const { data: pendingAdjustments } = useQuery({
    queryKey: ["payroll-dash-pending-adj"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_adjustments" as any).select("id").eq("status", "pending");
      return (data as any[]) || [];
    },
  });

  const { data: payrollPeriod } = useQuery({
    queryKey: ["payroll-dash-period", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_periods").select("*").eq("start_date", startStr).eq("end_date", endStr).maybeSingle();
      return data;
    },
  });

  const { data: latestRun } = useQuery({
    queryKey: ["payroll-dash-latest-run", payrollPeriod?.id],
    queryFn: async () => {
      if (!payrollPeriod?.id) return null;
      const { data } = await supabase.from("payroll_runs").select("*").eq("period_id", payrollPeriod.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!payrollPeriod?.id,
  });

  const totalGross = salaryStructures?.reduce((s, r) => s + Number(r.gross_salary || 0), 0) || 0;
  const empWithStructure = new Set(salaryStructures?.map(s => s.employee_id) || []);
  const missingStructures = (employees || []).filter(e => !empWithStructure.has(e.id)).length;

  const checklist = [
    { label: "Open attendance exceptions", count: exceptions?.length || 0, ok: (exceptions?.length || 0) === 0 },
    { label: "Pending regularizations", count: pendingRegs?.length || 0, ok: (pendingRegs?.length || 0) === 0 },
    { label: "Missing salary structures", count: missingStructures, ok: missingStructures === 0 },
    { label: "Payroll exceptions", count: payrollExceptions?.length || 0, ok: (payrollExceptions?.length || 0) === 0 },
    { label: "Pending adjustments", count: pendingAdjustments?.length || 0, ok: (pendingAdjustments?.length || 0) === 0 },
    { label: "Period locked", count: payrollPeriod?.status === "locked" ? 1 : 0, ok: payrollPeriod?.status === "locked" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-48" />
        <Badge variant={payrollPeriod?.status === "locked" ? "secondary" : "outline"}>
          {payrollPeriod?.status === "locked" ? "Period Locked" : "Period Open"}
        </Badge>
      </div>

      <LivePayrollPreview selectedMonth={selectedMonth} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{employees?.length || 0}</p><p className="text-xs text-muted-foreground">Active Employees</p></div>
        </CardContent></Card>

        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">₹{(totalGross / 100000).toFixed(1)}L</p><p className="text-xs text-muted-foreground">Est. Monthly Gross</p></div>
        </CardContent></Card>

        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{missingStructures}</p><p className="text-xs text-muted-foreground">Missing Structures</p></div>
        </CardContent></Card>

        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{workingDays}</p><p className="text-xs text-muted-foreground">Working Days</p></div>
        </CardContent></Card>
      </div>

      {latestRun && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Latest Payroll Run</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={latestRun.status === "approved" ? "default" : "secondary"}>{latestRun.status}</Badge></div>
              <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline">{(latestRun as any).run_type || "regular"}</Badge></div>
              <div><span className="text-muted-foreground">Gross:</span> ₹{Number(latestRun.total_gross).toLocaleString()}</div>
              <div><span className="text-muted-foreground">Net:</span> ₹{Number(latestRun.total_net).toLocaleString()}</div>
              <div><span className="text-muted-foreground">Employees:</span> {latestRun.employee_count}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Readiness Checklist</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">{item.label}</span>
                </div>
                <Badge variant={item.ok ? "default" : "destructive"} className="text-xs">{item.ok ? "Clear" : item.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
