import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, CheckCircle2, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const severityColors: Record<string, string> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export function PayrollExceptionsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("open");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const { data: exceptions } = useQuery({
    queryKey: ["payroll-exceptions", statusFilter],
    queryFn: async () => {
      let q = supabase.from("payroll_exceptions" as any).select("*, employees(first_name, last_name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return (data as any[]) || [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolveId || !resolution.trim()) throw new Error("Provide resolution notes");
      const { error } = await supabase.from("payroll_exceptions" as any).update({
        status: "resolved",
        resolution,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      } as any).eq("id", resolveId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exception resolved");
      queryClient.invalidateQueries({ queryKey: ["payroll-exceptions"] });
      setResolveId(null);
      setResolution("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const waiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_exceptions" as any).update({
        status: "waived",
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exception waived");
      queryClient.invalidateQueries({ queryKey: ["payroll-exceptions"] });
    },
  });

  if (!exceptions?.length && statusFilter === "open") {
    return <EmptyState icon={Shield} title="No payroll exceptions" description="All clear — no open exceptions found" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{exceptions?.length || 0} exceptions</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">SLA Due</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(exceptions || []).map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell>
                    <Badge variant={severityColors[ex.severity] as any || "secondary"} className="text-[10px]">
                      {ex.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{ex.exception_type?.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs">{ex.employees?.first_name} {ex.employees?.last_name}</TableCell>
                  <TableCell className="text-xs max-w-48 truncate">{ex.description}</TableCell>
                  <TableCell className="text-xs">{ex.sla_due_at ? format(new Date(ex.sla_due_at), "dd MMM HH:mm") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={ex.status === "resolved" ? "default" : "secondary"} className="text-[10px]">{ex.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {ex.status === "open" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setResolveId(ex.id)}>Resolve</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => waiveMutation.mutate(ex.id)}>Waive</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
          <Textarea placeholder="Resolution notes…" value={resolution} onChange={e => setResolution(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
