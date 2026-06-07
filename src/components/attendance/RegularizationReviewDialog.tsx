import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function RegularizationReviewList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests } = useQuery({
    queryKey: ["pending-regularizations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("regularization_requests")
        .select("*, employees(first_name, last_name, departments(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("regularization_requests")
        .update({ status: decision, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // If approved, update the attendance record
      if (decision === "approved" && reviewDialog) {
        const req = reviewDialog;
        const { data: existing } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("employee_id", req.employee_id)
          .eq("date", req.date)
          .maybeSingle();

        const clockIn = req.requested_clock_in;
        const clockOut = req.requested_clock_out;
        let workedHours: number | null = null;
        if (clockIn && clockOut) {
          workedHours = Math.round(((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000) * 100) / 100;
        }

        if (existing) {
          await supabase.from("attendance_records").update({
            clock_in: clockIn, clock_out: clockOut, worked_hours: workedHours, notes: `Regularized: ${req.reason}`,
          }).eq("id", existing.id);
        } else {
          await supabase.from("attendance_records").insert({
            employee_id: req.employee_id, date: req.date, clock_in: clockIn, clock_out: clockOut, worked_hours: workedHours,
            status: "present", notes: `Regularized: ${req.reason}`, marked_by: user?.id,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Request reviewed");
      queryClient.invalidateQueries({ queryKey: ["pending-regularizations"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setReviewDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!requests?.length) {
    return (
      <Card><CardContent>
        <EmptyState icon={FileText} title="No pending requests" description="All regularization requests have been reviewed." />
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req: any) => (
        <Card key={req.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{req.employees?.first_name} {req.employees?.last_name}</p>
                <p className="text-xs text-muted-foreground">{req.employees?.departments?.name || "—"} • {format(new Date(req.date), "MMM d, yyyy")}</p>
                <p className="text-xs mt-1">{req.reason}</p>
                {req.requested_clock_in && <p className="text-xs text-muted-foreground mt-0.5">In: {format(new Date(req.requested_clock_in), "hh:mm a")}</p>}
                {req.requested_clock_out && <p className="text-xs text-muted-foreground">Out: {format(new Date(req.requested_clock_out), "hh:mm a")}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => reviewMutation.mutate({ id: req.id, decision: "approved" })}>
                  <CheckCircle className="h-3 w-3 text-green-600" /> Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setReviewDialog(req); setRejectionReason(""); }}>
                  <XCircle className="h-3 w-3 text-destructive" /> Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!reviewDialog} onOpenChange={(v) => !v && setReviewDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => reviewDialog && reviewMutation.mutate({ id: reviewDialog.id, decision: "rejected" })}
              disabled={reviewMutation.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
