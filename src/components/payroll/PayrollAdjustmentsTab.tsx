import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, CheckCircle2, XCircle, Layers } from "lucide-react";
import { toast } from "sonner";

interface AdjForm {
  employee_id: string;
  adjustment_type: string;
  component_name: string;
  amount: number;
  effective_period_start: string;
  effective_period_end: string;
  is_recurring: boolean;
  recurrence_end: string;
  reason: string;
}

const emptyForm: AdjForm = {
  employee_id: "", adjustment_type: "earning", component_name: "", amount: 0,
  effective_period_start: "", effective_period_end: "", is_recurring: false, recurrence_end: "", reason: "",
};

export function PayrollAdjustmentsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdjForm>(emptyForm);
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: employees } = useQuery({
    queryKey: ["adj-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, first_name, last_name").eq("status", "active").order("first_name");
      return data || [];
    },
  });

  const { data: adjustments } = useQuery({
    queryKey: ["payroll-adjustments", statusFilter],
    queryFn: async () => {
      let q = supabase.from("payroll_adjustments" as any).select("*, employees(first_name, last_name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return (data as any[]) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.employee_id || !form.component_name) throw new Error("Fill required fields");
      const { error } = await supabase.from("payroll_adjustments" as any).insert({
        employee_id: form.employee_id,
        adjustment_type: form.adjustment_type,
        component_name: form.component_name,
        amount: form.amount,
        effective_period_start: form.effective_period_start || null,
        effective_period_end: form.effective_period_end || null,
        is_recurring: form.is_recurring,
        recurrence_end: form.recurrence_end || null,
        reason: form.reason || null,
        status: "pending",
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adjustment created");
      queryClient.invalidateQueries({ queryKey: ["payroll-adjustments"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.from("payroll_adjustments" as any).update({
        status: approve ? "approved" : "cancelled",
        approved_by: approve ? user?.id : null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adjustment updated");
      queryClient.invalidateQueries({ queryKey: ["payroll-adjustments"] });
    },
  });

  const typeColors: Record<string, string> = {
    earning: "default",
    deduction: "destructive",
    arrears: "secondary",
    reimbursement: "outline",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1" onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Adjustment
        </Button>
      </div>

      {!adjustments?.length ? (
        <EmptyState icon={Layers} title="No adjustments" description="Create earnings, deductions, or arrears adjustments" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Component</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Recurring</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.employees?.first_name} {a.employees?.last_name}</TableCell>
                    <TableCell>
                      <Badge variant={typeColors[a.adjustment_type] as any || "secondary"} className="text-[10px]">{a.adjustment_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.component_name}</TableCell>
                    <TableCell className="text-xs font-medium">₹{Number(a.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{a.is_recurring ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "approved" ? "default" : "secondary"} className="text-[10px]">{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.status === "pending" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => approveMutation.mutate({ id: a.id, approve: true })}>
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => approveMutation.mutate({ id: a.id, approve: false })}>
                            <XCircle className="h-3 w-3 text-destructive" />
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
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees || []).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.adjustment_type} onValueChange={v => setForm(f => ({ ...f, adjustment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Earning</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                    <SelectItem value="arrears">Arrears</SelectItem>
                    <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Component Name</Label>
                <Input value={form.component_name} onChange={e => setForm(f => ({ ...f, component_name: e.target.value }))} placeholder="e.g. Night Allowance" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} />
                <Label className="text-xs">Recurring</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Effective From</Label>
                <Input type="date" value={form.effective_period_start} onChange={e => setForm(f => ({ ...f, effective_period_start: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Effective To</Label>
                <Input type="date" value={form.effective_period_end} onChange={e => setForm(f => ({ ...f, effective_period_end: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
