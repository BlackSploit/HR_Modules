import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, CheckCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function ExceptionInbox() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("open");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolution, setResolution] = useState("");

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ["attendance-exceptions", statusFilter, severityFilter],
    queryFn: async () => {
      let q = supabase
        .from("attendance_exceptions")
        .select("*, employees(first_name, last_name, departments(name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (severityFilter !== "all") q = q.eq("severity", severityFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("attendance_exceptions")
        .update({
          status: newStatus,
          resolution: resolution || null,
          resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exception updated");
      queryClient.invalidateQueries({ queryKey: ["attendance-exceptions"] });
      setResolveDialog(null);
      setResolution("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const severityColors: Record<string, string> = {
    low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : !exceptions?.length ? (
        <Card><CardContent><EmptyState icon={CheckCircle} title="No exceptions" description="No attendance exceptions match your filters." /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {exceptions.map((ex: any) => (
            <Card key={ex.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {ex.employees?.first_name} {ex.employees?.last_name}
                      </span>
                      <Badge className={`text-[10px] ${severityColors[ex.severity] || ""}`}>
                        {ex.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {ex.exception_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ex.employees?.departments?.name || "—"} • {format(new Date(ex.created_at), "MMM d, hh:mm a")}
                    </p>
                    {ex.notes && <p className="text-xs mt-1">{ex.notes}</p>}
                    {ex.resolution && <p className="text-xs mt-1 text-green-600">Resolution: {ex.resolution}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ex.status !== "resolved" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setResolveDialog(ex); setResolution(""); }}>
                          <CheckCircle className="h-3 w-3" /> Resolve
                        </Button>
                        {ex.status !== "escalated" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                            onClick={() => resolveMutation.mutate({ id: ex.id, newStatus: "escalated" })}>
                            <ArrowUpCircle className="h-3 w-3" /> Escalate
                          </Button>
                        )}
                      </>
                    )}
                    <Badge variant={ex.status === "resolved" ? "secondary" : ex.status === "escalated" ? "destructive" : "outline"} className="text-[10px]">
                      {ex.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!resolveDialog} onOpenChange={(v) => !v && setResolveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Exception</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Resolution Notes</Label>
            <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="How was this resolved..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button onClick={() => resolveDialog && resolveMutation.mutate({ id: resolveDialog.id, newStatus: "resolved" })}
              disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "Saving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
