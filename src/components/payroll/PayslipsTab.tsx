import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, FileText, MessageSquareWarning } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PayslipDisputeDialog } from "./PayslipDisputeDialog";

export function PayslipsTab() {
  const [search, setSearch] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [viewItem, setViewItem] = useState<any>(null);
  const [disputeItem, setDisputeItem] = useState<any>(null);

  const { data: runs } = useQuery({
    queryKey: ["payslip-runs"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_runs").select("id, run_date, status, period_id, run_type, payroll_periods(start_date, end_date)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: lineItems } = useQuery({
    queryKey: ["payslip-items", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return [];
      const { data } = await supabase.from("payroll_line_items").select("*, employees(first_name, last_name, employee_code, departments(name))").eq("run_id", selectedRunId);
      return data || [];
    },
    enabled: !!selectedRunId,
  });

  const filtered = (lineItems || []).filter(i => {
    const name = `${i.employees?.first_name} ${i.employees?.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedRunId} onValueChange={setSelectedRunId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select payroll run" /></SelectTrigger>
          <SelectContent>
            {(runs || []).map(r => (
              <SelectItem key={r.id} value={r.id}>
                {(r as any).payroll_periods?.start_date} — {r.status} {(r as any).run_type !== "regular" ? `(${(r as any).run_type})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
      </div>

      {!selectedRunId ? (
        <EmptyState icon={FileText} title="Select a payroll run" description="Choose a payroll run above to view payslips" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Dept</TableHead>
                  <TableHead className="text-xs">Gross</TableHead>
                  <TableHead className="text-xs">Deductions</TableHead>
                  <TableHead className="text-xs">Net Pay</TableHead>
                  <TableHead className="text-xs w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs font-medium">{i.employees?.first_name} {i.employees?.last_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.employees?.employee_code || "—"}</TableCell>
                    <TableCell className="text-xs">{i.employees?.departments?.name || "—"}</TableCell>
                    <TableCell className="text-xs">₹{Number(i.gross_pay).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-destructive">₹{Number(i.total_deductions).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-medium text-primary">₹{Number(i.net_pay).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(i)}><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDisputeItem(i)}><MessageSquareWarning className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payslip — {viewItem?.employees?.first_name} {viewItem?.employees?.last_name}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Employee Code: <strong>{viewItem.employees?.employee_code || "—"}</strong></div>
                <div>Department: <strong>{viewItem.employees?.departments?.name || "—"}</strong></div>
                <div>Working Days: <strong>{viewItem.working_days}</strong></div>
                <div>Days Present: <strong>{viewItem.days_present}</strong></div>
                <div>Leave (Paid): <strong>{viewItem.days_leave_paid}</strong></div>
                <div>LOP Days: <strong>{viewItem.lop_days}</strong></div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">EARNINGS</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span>Basic Pay</span><span className="text-right">₹{Number(viewItem.basic_pay).toLocaleString()}</span>
                  <span>HRA</span><span className="text-right">₹{Number(viewItem.hra).toLocaleString()}</span>
                  <span>DA</span><span className="text-right">₹{Number(viewItem.da).toLocaleString()}</span>
                  <span>Special Allowance</span><span className="text-right">₹{Number(viewItem.special_allowance).toLocaleString()}</span>
                  <span>Overtime Pay</span><span className="text-right">₹{Number(viewItem.overtime_pay).toLocaleString()}</span>
                  {Number(viewItem.adjustments_earning || 0) > 0 && (
                    <><span className="text-primary">Adjustments (+)</span><span className="text-right text-primary">₹{Number(viewItem.adjustments_earning).toLocaleString()}</span></>
                  )}
                  <span className="font-semibold">Gross Pay</span><span className="text-right font-semibold">₹{Number(viewItem.gross_pay).toLocaleString()}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">DEDUCTIONS</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span>PF (Employee)</span><span className="text-right">₹{Number(viewItem.pf_employee).toLocaleString()}</span>
                  <span>ESI (Employee)</span><span className="text-right">₹{Number(viewItem.esi_employee).toLocaleString()}</span>
                  <span>Professional Tax</span><span className="text-right">₹{Number(viewItem.professional_tax).toLocaleString()}</span>
                  <span>TDS</span><span className="text-right">₹{Number(viewItem.tds).toLocaleString()}</span>
                  <span>LOP Deduction</span><span className="text-right">₹{Number(viewItem.lop_deduction).toLocaleString()}</span>
                  <span>Other</span><span className="text-right">₹{Number(viewItem.other_deductions).toLocaleString()}</span>
                  {Number(viewItem.adjustments_deduction || 0) > 0 && (
                    <><span className="text-destructive">Adjustments (-)</span><span className="text-right text-destructive">₹{Number(viewItem.adjustments_deduction).toLocaleString()}</span></>
                  )}
                  <span className="font-semibold">Total Deductions</span><span className="text-right font-semibold text-destructive">₹{Number(viewItem.total_deductions).toLocaleString()}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">GROSS → NET BREAKDOWN</p>
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between"><span>Gross Earnings</span><span>₹{Number(viewItem.gross_pay).toLocaleString()}</span></div>
                  <div className="flex justify-between text-destructive"><span>− Total Deductions</span><span>₹{Number(viewItem.total_deductions).toLocaleString()}</span></div>
                  {viewItem.previous_period_net && (
                    <div className="flex justify-between text-muted-foreground"><span>Previous Period Net</span><span>₹{Number(viewItem.previous_period_net).toLocaleString()}</span></div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Net Pay</span>
                <span className="text-primary">₹{Number(viewItem.net_pay).toLocaleString()}</span>
              </div>
              {viewItem.variance_pct != null && (
                <div className="text-xs text-muted-foreground text-center">
                  Variance from previous: <span className={Math.abs(viewItem.variance_pct) > 15 ? "text-destructive font-medium" : ""}>
                    {viewItem.variance_pct > 0 ? "+" : ""}{viewItem.variance_pct}%
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {disputeItem && (
        <PayslipDisputeDialog
          open={!!disputeItem}
          onOpenChange={() => setDisputeItem(null)}
          lineItemId={disputeItem.id}
          employeeId={disputeItem.employee_id}
        />
      )}
    </div>
  );
}
