import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

interface Props {
  selectedMonth: string;
}

export function LivePayrollPreview({ selectedMonth }: Props) {
  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");
  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d)).length;

  const { data: structures } = useQuery({
    queryKey: ["live-preview-structures"],
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_structures").select("employee_id, gross_salary, pf_employee, esi_employee, professional_tax, tds, other_deductions").eq("is_active", true);
      return data || [];
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["live-preview-attendance", startStr, endStr],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_records").select("employee_id, status").gte("date", startStr).lte("date", endStr);
      return data || [];
    },
  });

  const { data: adjustments } = useQuery({
    queryKey: ["live-preview-adjustments"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_adjustments" as any).select("employee_id, adjustment_type, amount").eq("status", "approved");
      return (data as any[]) || [];
    },
  });

  // Calculate live estimates
  const attMap = new Map<string, number>();
  (attendance || []).forEach(r => {
    if (r.status === "present" || r.status === "late") {
      attMap.set(r.employee_id, (attMap.get(r.employee_id) || 0) + 1);
    }
  });

  let estGross = 0, estDeductions = 0, estAdjEarnings = 0, estAdjDeductions = 0;
  const empIds = new Set<string>();

  (structures || []).forEach(s => {
    empIds.add(s.employee_id);
    const present = attMap.get(s.employee_id) || 0;
    const ratio = workingDays > 0 ? Math.min(present / workingDays, 1) : 0;
    const gross = Number(s.gross_salary || 0) * ratio;
    const ded = (Number(s.pf_employee || 0) + Number(s.esi_employee || 0) + Number(s.professional_tax || 0) + Number(s.tds || 0) + Number(s.other_deductions || 0)) * ratio;
    estGross += gross;
    estDeductions += ded;
  });

  (adjustments || []).forEach((a: any) => {
    if (a.adjustment_type === "earning" || a.adjustment_type === "arrears" || a.adjustment_type === "reimbursement") {
      estAdjEarnings += Number(a.amount);
    } else {
      estAdjDeductions += Number(a.amount);
    }
  });

  const totalGross = estGross + estAdjEarnings;
  const totalDed = estDeductions + estAdjDeductions;
  const estNet = totalGross - totalDed;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Live Payroll Preview
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">Real-time estimate</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Est. Gross</p>
            <p className="text-lg font-bold">₹{Math.round(totalGross).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Est. Deductions</p>
            <p className="text-lg font-bold text-destructive">₹{Math.round(totalDed).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Est. Net Pay</p>
            <p className="text-lg font-bold text-green-600">₹{Math.round(estNet).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Adjustments</p>
            <div className="flex items-center gap-2">
              {estAdjEarnings > 0 && (
                <span className="text-xs flex items-center gap-0.5 text-green-600">
                  <TrendingUp className="h-3 w-3" />+₹{Math.round(estAdjEarnings).toLocaleString()}
                </span>
              )}
              {estAdjDeductions > 0 && (
                <span className="text-xs flex items-center gap-0.5 text-destructive">
                  <TrendingDown className="h-3 w-3" />-₹{Math.round(estAdjDeductions).toLocaleString()}
                </span>
              )}
              {estAdjEarnings === 0 && estAdjDeductions === 0 && <span className="text-xs text-muted-foreground">None</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
