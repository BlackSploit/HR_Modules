import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, differenceInMonths } from "date-fns";
import { Upload, AlertTriangle, Info } from "lucide-react";

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  leaveTypes: any[];
  balances: any[];
}

export function LeaveRequestDialog({ open, onOpenChange, employeeId, leaveTypes, balances }: LeaveRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    half_day: "" as "" | "first_half" | "second_half",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "", half_day: "" });
      setFile(null);
    }
  }, [open]);

  const selectedType = leaveTypes?.find((lt) => lt.id === form.leave_type_id);
  const selectedBalance = balances?.find((b) => b.leave_type_id === form.leave_type_id);
  const remaining = selectedBalance ? selectedBalance.total_days - Number(selectedBalance.used_days) : null;

  const totalDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    if (form.half_day) return 0.5;
    const days = differenceInDays(new Date(form.end_date), new Date(form.start_date)) + 1;
    return Math.max(days, 0);
  }, [form.start_date, form.end_date, form.half_day]);

  const projectedBalance = remaining !== null && totalDays > 0 ? remaining - totalDays : remaining;

  // Fetch applicable policies for policy checks
  const { data: applicablePolicies } = useQuery({
    queryKey: ["leave-policies-for-type", form.leave_type_id],
    queryFn: async () => {
      if (!form.leave_type_id) return [];
      const { data } = await supabase
        .from("leave_policies")
        .select("*")
        .eq("leave_type_id", form.leave_type_id)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!form.leave_type_id,
  });

  // Fetch employee details for tenure check
  const { data: employeeDetails } = useQuery({
    queryKey: ["employee-details", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("date_of_joining, department_id").eq("id", employeeId).single();
      return data;
    },
    enabled: !!employeeId,
  });

  // Policy violation checks
  const policyViolations = useMemo(() => {
    const violations: string[] = [];
    if (!applicablePolicies?.length || !form.start_date) return violations;

    applicablePolicies.forEach((policy: any) => {
      if (policy.max_continuous_days && totalDays > policy.max_continuous_days) {
        violations.push(`Exceeds max continuous days of ${policy.max_continuous_days} for this leave type`);
      }
      if (policy.notice_days_required > 0 && form.start_date) {
        const daysUntil = differenceInDays(new Date(form.start_date), new Date());
        if (daysUntil < policy.notice_days_required) {
          violations.push(`Requires ${policy.notice_days_required} days advance notice (only ${Math.max(0, daysUntil)} days)`);
        }
      }
      if (policy.min_tenure_months > 0 && employeeDetails?.date_of_joining) {
        const tenureMonths = differenceInMonths(new Date(), new Date(employeeDetails.date_of_joining));
        if (tenureMonths < policy.min_tenure_months) {
          violations.push(`Requires ${policy.min_tenure_months} months tenure (you have ${tenureMonths})`);
        }
      }
      if (Array.isArray(policy.blackout_dates) && form.start_date && form.end_date) {
        policy.blackout_dates.forEach((range: any) => {
          if (range.start && range.end) {
            const bStart = new Date(range.start);
            const bEnd = new Date(range.end);
            const rStart = new Date(form.start_date);
            const rEnd = new Date(form.end_date || form.start_date);
            if (rStart <= bEnd && rEnd >= bStart) {
              violations.push(`Leave dates overlap with blackout period (${range.start} to ${range.end})`);
            }
          }
        });
      }
    });

    return violations;
  }, [applicablePolicies, form.start_date, form.end_date, totalDays, employeeDetails]);

  const isSingleDay = form.start_date && form.end_date && form.start_date === form.end_date;

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Employee record not found");
      if (totalDays <= 0) throw new Error("Invalid date range");
      if (remaining !== null && totalDays > remaining) {
        throw new Error(`Insufficient balance: only ${remaining} day(s) remaining`);
      }

      let documentUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${employeeId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("leave-documents")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("leave-documents").getPublicUrl(path);
        documentUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.half_day ? form.start_date : form.end_date,
        total_days: totalDays,
        reason: form.reason || null,
        half_day: form.half_day || null,
        document_url: documentUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Leave request submitted" });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {leaveTypes?.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>{lt.name} ({lt.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {remaining !== null && (
              <p className="text-xs text-muted-foreground">
                Balance: <span className={remaining <= 0 ? "text-destructive font-semibold" : "text-primary font-semibold"}>{remaining}</span> day(s) remaining
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            {!form.half_day && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            )}
          </div>

          {isSingleDay && !form.half_day && (
            <div className="space-y-2">
              <Label>Half Day?</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, half_day: "first_half", end_date: form.start_date })}>
                  First Half
                </Button>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, half_day: "second_half", end_date: form.start_date })}>
                  Second Half
                </Button>
              </div>
            </div>
          )}

          {form.half_day && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{form.half_day === "first_half" ? "First Half" : "Second Half"}</Badge>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setForm({ ...form, half_day: "" })}>
                Clear
              </Button>
            </div>
          )}

          {totalDays > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total: {totalDays} day(s)</p>
              {projectedBalance !== null && (
                <p className="text-xs flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Projected balance after: <span className={projectedBalance < 0 ? "text-destructive font-semibold" : "text-primary font-semibold"}>{projectedBalance}</span> day(s)
                </p>
              )}
            </div>
          )}

          {policyViolations.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {policyViolations.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Reason {selectedType?.requires_document ? "" : "(optional)"}</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Provide a reason..." rows={3} />
          </div>

          {selectedType?.requires_document && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" /> Supporting Document <span className="text-destructive">*</span>
              </Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {!file && <p className="text-xs text-destructive">This leave type requires a supporting document.</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={() => submitRequest.mutate()}
              disabled={
                !form.leave_type_id ||
                !form.start_date ||
                (!form.end_date && !form.half_day) ||
                totalDays <= 0 ||
                (remaining !== null && totalDays > remaining) ||
                (selectedType?.requires_document && !file) ||
                policyViolations.length > 0 ||
                submitRequest.isPending
              }
            >
              {submitRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
