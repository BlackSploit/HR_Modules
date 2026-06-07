import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItemId: string;
  employeeId: string;
}

export function PayslipDisputeDialog({ open, onOpenChange, lineItemId, employeeId }: Props) {
  const queryClient = useQueryClient();
  const [disputeType, setDisputeType] = useState("deduction_query");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Please describe the issue");
      const { error } = await supabase.from("payroll_disputes" as any).insert({
        line_item_id: lineItemId,
        employee_id: employeeId,
        dispute_type: disputeType,
        description,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["payroll-disputes"] });
      onOpenChange(false);
      setDescription("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Raise Payslip Dispute</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Dispute Type</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deduction_query">Deduction Query</SelectItem>
                <SelectItem value="missing_earning">Missing Earning</SelectItem>
                <SelectItem value="incorrect_days">Incorrect Days</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe what seems incorrect…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Submit Dispute</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
