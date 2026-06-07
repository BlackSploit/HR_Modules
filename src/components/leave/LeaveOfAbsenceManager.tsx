import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, FileText } from "lucide-react";
import { format } from "date-fns";

const caseStatusMap: Record<string, "active" | "warning" | "pending" | "overdue"> = {
  active: "active",
  extended: "warning",
  returned: "pending",
  closed: "overdue",
};

export function LeaveOfAbsenceManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showContactLog, setShowContactLog] = useState<string | null>(null);
  const [contactNote, setContactNote] = useState("");

  const { data: cases, isLoading } = useQuery({
    queryKey: ["loa-cases"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_of_absence_cases")
        .select("*, employees(first_name, last_name, departments(name)), leave_requests(start_date, end_date, leave_types(name))")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: approvedLongLeaves } = useQuery({
    queryKey: ["approved-long-leaves"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("id, employee_id, start_date, end_date, total_days, employees(first_name, last_name), leave_types(name)")
        .eq("status", "approved")
        .gte("total_days", 7)
        .order("start_date", { ascending: false });
      return data || [];
    },
    enabled: showCreate,
  });

  const [createForm, setCreateForm] = useState({
    leave_request_id: "", case_type: "long_medical", expected_return_date: "", notes: "",
  });

  const createCase = useMutation({
    mutationFn: async () => {
      const leave = approvedLongLeaves?.find((l: any) => l.id === createForm.leave_request_id);
      if (!leave) throw new Error("Select a leave request");
      const { error } = await supabase.from("leave_of_absence_cases").insert({
        leave_request_id: createForm.leave_request_id,
        employee_id: leave.employee_id,
        case_type: createForm.case_type,
        expected_return_date: createForm.expected_return_date || null,
        notes: createForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "LOA case created" });
      queryClient.invalidateQueries({ queryKey: ["loa-cases"] });
      setShowCreate(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("leave_of_absence_cases").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Case updated" });
      queryClient.invalidateQueries({ queryKey: ["loa-cases"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addContact = useMutation({
    mutationFn: async (caseId: string) => {
      const c = cases?.find((c: any) => c.id === caseId);
      if (!c) return;
      const log = Array.isArray(c.contact_log) ? [...c.contact_log] : [];
      log.push({ date: new Date().toISOString(), notes: contactNote, contacted_by: user?.id });
      const { error } = await supabase.from("leave_of_absence_cases").update({ contact_log: log }).eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contact logged" });
      queryClient.invalidateQueries({ queryKey: ["loa-cases"] });
      setContactNote("");
      setShowContactLog(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New LOA Case
        </Button>
      </div>

      {!cases?.length ? (
        <Card><CardContent><EmptyState icon={Briefcase} title="No LOA cases" description="Long-absence cases will appear here." /></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Leave Period</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Med Cert</TableHead>
                <TableHead>Fitness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.employees?.first_name} {c.employees?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{c.employees?.departments?.name}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.case_type}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {c.leave_requests?.start_date && format(new Date(c.leave_requests.start_date), "MMM d")} – {c.leave_requests?.end_date && format(new Date(c.leave_requests.end_date), "MMM d")}
                  </TableCell>
                  <TableCell className="text-sm">{c.expected_return_date ? format(new Date(c.expected_return_date), "MMM d, yyyy") : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={c.medical_certificate_status === "verified" ? "default" : c.medical_certificate_status === "received" ? "secondary" : "destructive"} className="text-[10px]">
                      {c.medical_certificate_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.fitness_clearance ? "✓" : "✗"}</TableCell>
                  <TableCell><StatusChip status={caseStatusMap[c.status] || "pending"} label={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowContactLog(c.id)}>Log Contact</Button>
                      {c.status === "active" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => updateCase.mutate({ id: c.id, updates: { fitness_clearance: true } })}>
                            Clear Fitness
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => updateCase.mutate({ id: c.id, updates: { status: "returned", actual_return_date: new Date().toISOString().split("T")[0] } })}>
                            Mark Returned
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Leave of Absence Case</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Linked Leave Request (7+ days)</Label>
              <Select value={createForm.leave_request_id} onValueChange={(v) => setCreateForm({ ...createForm, leave_request_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select approved leave" /></SelectTrigger>
                <SelectContent>
                  {approvedLongLeaves?.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.employees?.first_name} {l.employees?.last_name} — {l.leave_types?.name} ({l.total_days}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Case Type</Label>
              <Select value={createForm.case_type} onValueChange={(v) => setCreateForm({ ...createForm, case_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="long_medical">Long Medical</SelectItem>
                  <SelectItem value="study">Study Leave</SelectItem>
                  <SelectItem value="extended_sick">Extended Sick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Expected Return Date</Label>
              <Input type="date" value={createForm.expected_return_date} onChange={(e) => setCreateForm({ ...createForm, expected_return_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createCase.mutate()} disabled={!createForm.leave_request_id || createCase.isPending}>
                {createCase.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Log Dialog */}
      <Dialog open={!!showContactLog} onOpenChange={(o) => !o && setShowContactLog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {showContactLog && cases?.find((c: any) => c.id === showContactLog)?.contact_log && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(cases.find((c: any) => c.id === showContactLog)?.contact_log as any[])?.map((entry: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {format(new Date(entry.date), "MMM d, HH:mm")}: {entry.notes}
                  </p>
                ))}
              </div>
            )}
            <Textarea value={contactNote} onChange={(e) => setContactNote(e.target.value)} placeholder="Contact notes..." rows={2} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowContactLog(null)}>Cancel</Button>
              <Button onClick={() => showContactLog && addContact.mutate(showContactLog)} disabled={!contactNote || addContact.isPending}>
                {addContact.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
