import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, Clock, XCircle, ArrowRight, GitBranch } from "lucide-react";
import { format } from "date-fns";

interface LeaveApprovalChainProps {
  leaveRequestId: string;
}

const stepStatusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
  escalated: <Clock className="h-4 w-4 text-orange-500" />,
};

export function LeaveApprovalChain({ leaveRequestId }: LeaveApprovalChainProps) {
  const { data: steps, isLoading } = useQuery({
    queryKey: ["leave-approval-steps", leaveRequestId],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_approval_steps")
        .select("*")
        .eq("leave_request_id", leaveRequestId)
        .order("sequence_number");
      return data || [];
    },
    enabled: !!leaveRequestId,
  });

  if (isLoading) return <Skeleton className="h-16" />;
  if (!steps?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <GitBranch className="h-4 w-4" /> Approval Chain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          {steps.map((step: any, idx: number) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-2 rounded-md border bg-muted/30">
                {stepStatusIcon[step.status] || stepStatusIcon.pending}
                <div className="text-xs">
                  <p className="font-medium">{step.approver_role || "Approver"}</p>
                  <p className="text-muted-foreground">
                    {step.status === "pending"
                      ? `SLA: ${step.sla_hours}h`
                      : step.acted_at
                        ? format(new Date(step.acted_at), "MMM d, HH:mm")
                        : step.status}
                  </p>
                </div>
                <Badge variant={step.status === "approved" ? "default" : step.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {step.status}
                </Badge>
              </div>
              {idx < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
