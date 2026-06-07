import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Eye } from "lucide-react";

export function PayrollHistoryTab() {
  const [drillRunId, setDrillRunId] = useState<string | null>(null);

  const { data: runs } = useQuery({
    queryKey: ["payroll-history-runs"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_runs").select("*, payroll_periods(start_date, end_date)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: drillItems } = useQuery({
    queryKey: ["payroll-history-drill", drillRunId],
    queryFn: async () => {
      if (!drillRunId) return [];
      const { data } = await supabase.from("payroll_line_items").select("*, employees(first_name, last_name)").eq("run_id", drillRunId);
      return data || [];
    },
    enabled: !!drillRunId,
  });

  if (!runs?.length) return <EmptyState icon={FileText} title="No payroll history" description="Run payroll to see history here" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Period</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Run Date</TableHead>
                <TableHead className="text-xs">Employees</TableHead>
                <TableHead className="text-xs">Total Gross</TableHead>
                <TableHead className="text-xs">Total Net</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Reviewer</TableHead>
                <TableHead className="text-xs w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{(r as any).payroll_periods?.start_date} → {(r as any).payroll_periods?.end_date}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{(r as any).run_type || "regular"}</Badge></TableCell>
                  <TableCell className="text-xs">{r.run_date}</TableCell>
                  <TableCell className="text-xs">{r.employee_count}</TableCell>
                  <TableCell className="text-xs">₹{Number(r.total_gross).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-medium text-primary">₹{Number(r.total_net).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.status === "approved" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(r as any).reviewed_by ? "✓ Reviewed" : "—"}
                    {(r as any).approved_by ? " · ✓ Approved" : ""}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDrillRunId(r.id)}><Eye className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!drillRunId} onOpenChange={() => setDrillRunId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Payroll Run Details</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Gross</TableHead>
                <TableHead className="text-xs">Adj+</TableHead>
                <TableHead className="text-xs">Adj-</TableHead>
                <TableHead className="text-xs">Deductions</TableHead>
                <TableHead className="text-xs">Net</TableHead>
                <TableHead className="text-xs">Var%</TableHead>
                <TableHead className="text-xs">LOP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(drillItems || []).map(i => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{i.employees?.first_name} {i.employees?.last_name}</TableCell>
                  <TableCell className="text-xs">₹{Number(i.gross_pay).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{Number(i.adjustments_earning || 0) > 0 ? `₹${Number(i.adjustments_earning).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="text-xs">{Number(i.adjustments_deduction || 0) > 0 ? `₹${Number(i.adjustments_deduction).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="text-xs text-destructive">₹{Number(i.total_deductions).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-primary">₹{Number(i.net_pay).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{i.variance_pct != null ? `${i.variance_pct}%` : "—"}</TableCell>
                  <TableCell className="text-xs">{i.lop_days || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
