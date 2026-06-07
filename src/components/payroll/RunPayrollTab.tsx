import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, Play, Lock, Calculator, ShieldCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

export function RunPayrollTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [runType, setRunType] = useState("regular");
  const [step, setStep] = useState<"select" | "validate" | "calculate" | "review" | "reviewed">("select");
  const [lineItems, setLineItems] = useState<any[]>([]);

  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");
  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d)).length;

  const { data: employees } = useQuery({
    queryKey: ["run-payroll-emps"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, first_name, last_name, departments(name)").eq("status", "active").order("first_name");
      return data || [];
    },
  });

  const { data: structures } = useQuery({
    queryKey: ["run-payroll-structures"],
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_structures").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["run-payroll-attendance", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_records").select("employee_id, status, worked_hours, overtime_hours").gte("date", startStr).lte("date", endStr);
      return data || [];
    },
  });

  const { data: leaves } = useQuery({
    queryKey: ["run-payroll-leaves", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests" as any).select("employee_id, total_days, leave_type_id, status").eq("status", "approved").gte("start_date", startStr).lte("end_date", endStr);
      return (data as any[]) || [];
    },
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["run-payroll-leave-types"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("id, is_paid");
      return data || [];
    },
  });

  const { data: adjustments } = useQuery({
    queryKey: ["run-payroll-adjustments"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_adjustments" as any).select("*").eq("status", "approved");
      return (data as any[]) || [];
    },
  });

  const { data: payrollPeriod } = useQuery({
    queryKey: ["run-payroll-period", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_periods").select("*").eq("start_date", startStr).eq("end_date", endStr).maybeSingle();
      return data;
    },
  });

  const { data: previousRun } = useQuery({
    queryKey: ["run-payroll-previous"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_line_items").select("employee_id, net_pay").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const structureMap = new Map((structures || []).map(s => [s.employee_id, s]));
  const paidLeaveTypes = new Set((leaveTypes || []).filter(lt => lt.is_paid).map(lt => lt.id));
  const empsMissing = (employees || []).filter(e => !structureMap.has(e.id));
  const prevNetMap = new Map<string, number>();
  (previousRun || []).forEach(p => { if (!prevNetMap.has(p.employee_id)) prevNetMap.set(p.employee_id, Number(p.net_pay)); });

  function calculatePayroll() {
    const items: any[] = [];
    const attMap = new Map<string, { present: number; absent: number; ot: number }>();
    (employees || []).forEach(e => attMap.set(e.id, { present: 0, absent: 0, ot: 0 }));
    (attendance || []).forEach((r: any) => {
      const a = attMap.get(r.employee_id);
      if (!a) return;
      if (r.status === "present" || r.status === "late") a.present++;
      else if (r.status === "absent") a.absent++;
      a.ot += Number(r.overtime_hours || 0);
    });

    const leaveMap = new Map<string, { paid: number; unpaid: number }>();
    (leaves || []).forEach((l: any) => {
      const prev = leaveMap.get(l.employee_id) || { paid: 0, unpaid: 0 };
      if (paidLeaveTypes.has(l.leave_type_id)) prev.paid += Number(l.total_days || 0);
      else prev.unpaid += Number(l.total_days || 0);
      leaveMap.set(l.employee_id, prev);
    });

    // Group adjustments by employee
    const adjMap = new Map<string, { earnings: number; deductions: number }>();
    (adjustments || []).forEach((a: any) => {
      const prev = adjMap.get(a.employee_id) || { earnings: 0, deductions: 0 };
      if (a.adjustment_type === "earning" || a.adjustment_type === "arrears" || a.adjustment_type === "reimbursement") {
        prev.earnings += Number(a.amount);
      } else {
        prev.deductions += Number(a.amount);
      }
      adjMap.set(a.employee_id, prev);
    });

    (employees || []).forEach(emp => {
      const sal = structureMap.get(emp.id);
      if (!sal) return;
      const att = attMap.get(emp.id) || { present: 0, absent: 0, ot: 0 };
      const lv = leaveMap.get(emp.id) || { paid: 0, unpaid: 0 };
      const adj = adjMap.get(emp.id) || { earnings: 0, deductions: 0 };

      const payableDays = att.present + lv.paid;
      const lopDays = Math.max(0, workingDays - payableDays);
      const ratio = workingDays > 0 ? payableDays / workingDays : 0;

      const basic = Number(sal.basic_pay) * ratio;
      const hra = Number(sal.hra || 0) * ratio;
      const da = Number(sal.da || 0) * ratio;
      const spa = Number(sal.special_allowance || 0) * ratio;
      const otPay = workingDays > 0 ? att.ot * (Number(sal.basic_pay) / workingDays / 8) * 2 : 0;
      const grossPay = basic + hra + da + spa + otPay + adj.earnings;

      const pfEmp = Number(sal.pf_employee || 0) * ratio;
      const pfEr = Number(sal.pf_employer || 0) * ratio;
      const esiEmp = Number(sal.esi_employee || 0) * ratio;
      const esiEr = Number(sal.esi_employer || 0) * ratio;
      const pt = Number(sal.professional_tax || 0);
      const tds = Number(sal.tds || 0);
      const other = Number(sal.other_deductions || 0);
      const lopDed = workingDays > 0 ? (Number(sal.basic_pay) / workingDays) * lopDays : 0;
      const totalDed = pfEmp + esiEmp + pt + tds + other + lopDed + adj.deductions;
      const netPay = grossPay - totalDed;

      const prevNet = prevNetMap.get(emp.id);
      const variancePct = prevNet && prevNet > 0 ? ((netPay - prevNet) / prevNet) * 100 : null;

      items.push({
        employee_id: emp.id, empName: `${emp.first_name} ${emp.last_name}`, dept: emp.departments?.name || "—",
        working_days: workingDays, days_present: att.present, days_absent: att.absent,
        days_leave_paid: lv.paid, days_leave_unpaid: lv.unpaid, overtime_hours: att.ot,
        basic_pay: Math.round(basic), hra: Math.round(hra), da: Math.round(da), special_allowance: Math.round(spa),
        overtime_pay: Math.round(otPay), gross_pay: Math.round(grossPay),
        pf_employee: Math.round(pfEmp), pf_employer: Math.round(pfEr), esi_employee: Math.round(esiEmp), esi_employer: Math.round(esiEr),
        professional_tax: Math.round(pt), tds: Math.round(tds), other_deductions: Math.round(other),
        total_deductions: Math.round(totalDed), net_pay: Math.round(netPay), lop_days: lopDays, lop_deduction: Math.round(lopDed),
        adjustments_earning: Math.round(adj.earnings), adjustments_deduction: Math.round(adj.deductions),
        arrears: 0, previous_period_net: prevNet ? Math.round(prevNet) : null, variance_pct: variancePct ? Math.round(variancePct * 10) / 10 : null,
      });
    });

    setLineItems(items);
    setStep("review");
  }

  const saveMutation = useMutation({
    mutationFn: async (finalStatus: string) => {
      let periodId = payrollPeriod?.id;
      if (!periodId) {
        const { data, error } = await supabase.from("payroll_periods").insert({ start_date: startStr, end_date: endStr, status: "open" }).select("id").single();
        if (error) throw error;
        periodId = data.id;
      }

      const totalGross = lineItems.reduce((s, i) => s + i.gross_pay, 0);
      const totalDed = lineItems.reduce((s, i) => s + i.total_deductions, 0);
      const totalNet = lineItems.reduce((s, i) => s + i.net_pay, 0);

      const runData: any = {
        period_id: periodId, run_by: user?.id, status: finalStatus,
        total_gross: totalGross, total_deductions: totalDed, total_net: totalNet, employee_count: lineItems.length,
        run_type: runType,
      };
      if (finalStatus === "reviewed") { runData.reviewed_by = user?.id; runData.reviewed_at = new Date().toISOString(); }
      if (finalStatus === "approved") { runData.approved_by = user?.id; runData.approved_at = new Date().toISOString(); }

      const { data: run, error: runErr } = await supabase.from("payroll_runs").insert(runData).select("id").single();
      if (runErr) throw runErr;

      const items = lineItems.map(i => ({
        run_id: run.id, employee_id: i.employee_id, working_days: i.working_days, days_present: i.days_present,
        days_absent: i.days_absent, days_leave_paid: i.days_leave_paid, days_leave_unpaid: i.days_leave_unpaid,
        overtime_hours: i.overtime_hours, basic_pay: i.basic_pay, hra: i.hra, da: i.da,
        special_allowance: i.special_allowance, overtime_pay: i.overtime_pay, gross_pay: i.gross_pay,
        pf_employee: i.pf_employee, pf_employer: i.pf_employer, esi_employee: i.esi_employee, esi_employer: i.esi_employer,
        professional_tax: i.professional_tax, tds: i.tds, other_deductions: i.other_deductions,
        total_deductions: i.total_deductions, net_pay: i.net_pay, lop_days: i.lop_days, lop_deduction: i.lop_deduction,
        adjustments_earning: i.adjustments_earning, adjustments_deduction: i.adjustments_deduction,
        arrears: i.arrears, previous_period_net: i.previous_period_net, variance_pct: i.variance_pct,
        status: "calculated",
      }));

      const { error: liErr } = await supabase.from("payroll_line_items").insert(items);
      if (liErr) throw liErr;

      // Mark adjustments as applied
      const adjIds = (adjustments || []).filter((a: any) => lineItems.some(li => li.employee_id === a.employee_id)).map((a: any) => a.id);
      if (adjIds.length > 0) {
        await supabase.from("payroll_adjustments" as any).update({ status: "applied", applied_in_run_id: run.id } as any).in("id", adjIds);
      }
    },
    onSuccess: (_, status) => {
      toast.success(`Payroll run saved as "${status}"`);
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      setStep("select");
      setLineItems([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const anomalyCount = lineItems.filter(i => i.variance_pct != null && Math.abs(i.variance_pct) > 15).length;

  return (
    <div className="space-y-4">
      {step === "select" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Select Payroll Period</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-48" />
              <Select value={runType} onValueChange={setRunType}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="off_cycle">Off-Cycle</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="fnf">Full & Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setStep("validate")} className="gap-1"><Play className="h-4 w-4" /> Start Payroll Process</Button>
          </CardContent>
        </Card>
      )}

      {step === "validate" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Validate Readiness — {format(monthStart, "MMMM yyyy")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {empsMissing.length === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                <span className="text-sm">{empsMissing.length === 0 ? "All employees have salary structures" : `${empsMissing.length} employees missing salary structures`}</span>
              </div>
              {empsMissing.length > 0 && (
                <div className="ml-6 text-xs text-muted-foreground space-y-0.5">
                  {empsMissing.slice(0, 5).map(e => <div key={e.id}>• {e.first_name} {e.last_name}</div>)}
                  {empsMissing.length > 5 && <div>...and {empsMissing.length - 5} more</div>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm">Run type: <Badge variant="outline">{runType}</Badge></span>
              </div>
              {(adjustments || []).length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">{adjustments?.length} approved adjustments will be included</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button onClick={calculatePayroll} className="gap-1"><Calculator className="h-4 w-4" /> Calculate Payroll</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(step === "review" || step === "reviewed") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Review Payroll — {format(monthStart, "MMMM yyyy")}</h3>
              <Badge variant="outline">{runType}</Badge>
              {anomalyCount > 0 && <Badge variant="destructive">{anomalyCount} anomalies</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("validate")}>Back</Button>
              {step === "review" && (
                <Button size="sm" variant="secondary" className="gap-1" onClick={() => saveMutation.mutate("reviewed")} disabled={saveMutation.isPending}>
                  <Eye className="h-4 w-4" /> Mark Reviewed
                </Button>
              )}
              <Button size="sm" className="gap-1" onClick={() => saveMutation.mutate("approved")} disabled={saveMutation.isPending}>
                <ShieldCheck className="h-4 w-4" /> Approve & Save
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">₹{lineItems.reduce((s, i) => s + i.gross_pay, 0).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Total Gross</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-destructive">₹{lineItems.reduce((s, i) => s + i.total_deductions, 0).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Total Deductions</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-primary">₹{lineItems.reduce((s, i) => s + i.net_pay, 0).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Total Net Pay</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Dept</TableHead>
                    <TableHead className="text-xs">Present</TableHead>
                    <TableHead className="text-xs">LOP</TableHead>
                    <TableHead className="text-xs">OT Hrs</TableHead>
                    <TableHead className="text-xs">Adj+</TableHead>
                    <TableHead className="text-xs">Adj-</TableHead>
                    <TableHead className="text-xs">Gross</TableHead>
                    <TableHead className="text-xs">Deductions</TableHead>
                    <TableHead className="text-xs">Net Pay</TableHead>
                    <TableHead className="text-xs">Var%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map(i => {
                    const hasAnomaly = i.variance_pct != null && Math.abs(i.variance_pct) > 15;
                    return (
                      <TableRow key={i.employee_id} className={hasAnomaly ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs font-medium">{i.empName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{i.dept}</TableCell>
                        <TableCell className="text-xs">{i.days_present}</TableCell>
                        <TableCell className="text-xs">{i.lop_days > 0 ? <span className="text-destructive">{i.lop_days}</span> : "0"}</TableCell>
                        <TableCell className="text-xs">{i.overtime_hours > 0 ? i.overtime_hours.toFixed(1) : "0"}</TableCell>
                        <TableCell className="text-xs">{i.adjustments_earning > 0 ? <span className="text-primary">+₹{i.adjustments_earning.toLocaleString()}</span> : "—"}</TableCell>
                        <TableCell className="text-xs">{i.adjustments_deduction > 0 ? <span className="text-destructive">-₹{i.adjustments_deduction.toLocaleString()}</span> : "—"}</TableCell>
                        <TableCell className="text-xs">₹{i.gross_pay.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-destructive">₹{i.total_deductions.toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-medium text-primary">₹{i.net_pay.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">
                          {i.variance_pct != null ? (
                            <span className={hasAnomaly ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {i.variance_pct > 0 ? "+" : ""}{i.variance_pct}%
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
