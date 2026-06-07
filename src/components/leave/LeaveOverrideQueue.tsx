import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

const overrideStatusMap: Record<string, "active" | "warning" | "overdue" | "pending"> = {
  pending: "pending",
  approved: "active",
  rejected: "overdue",
};

export function LeaveOverrideQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["leave-overrides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_overrides")
        .select("*, leave_requests(employee_id, start_date, end_date, total_days, leave_types(name, code), employees(first_name, last_name, departments(name)))")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateOverride = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_overrides").update({
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Override updated" });
      queryClient.invalidateQueries({ queryKey: ["leave-overrides"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  if (!overrides?.length) {
    return <Card><CardContent><EmptyState icon={ShieldAlert} title="No overrides" description="Exception requests will appear here." /></CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Override Type</TableHead>
              <TableHead>Leave</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overrides.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{o.leave_requests?.employees?.first_name} {o.leave_requests?.employees?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{o.leave_requests?.employees?.departments?.name}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{o.override_type?.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {o.leave_requests?.leave_types?.code} • {o.leave_requests?.total_days}d
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {o.leave_requests?.start_date && format(new Date(o.leave_requests.start_date), "MMM d")} – {o.leave_requests?.end_date && format(new Date(o.leave_requests.end_date), "MMM d")}
                  </span>
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{o.reason}</TableCell>
                <TableCell>
                  <StatusChip status={overrideStatusMap[o.status] || "pending"} label={o.status} />
                </TableCell>
                <TableCell>
                  {o.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateOverride.mutate({ id: o.id, status: "approved" })}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateOverride.mutate({ id: o.id, status: "rejected" })}>
                        <XCircle className="h-4 w-4" />
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
  );
}
