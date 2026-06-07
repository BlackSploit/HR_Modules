import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CalendarDays, ClipboardCheck, ListChecks, Users } from "lucide-react";

const REVIEW_TYPES = [
  { value: "mdt_weekly", label: "MDT Weekly Review", icon: Users },
  { value: "center_weekly", label: "Center Weekly Review", icon: CalendarDays },
  { value: "monthly_leadership", label: "Monthly Leadership Review", icon: ClipboardCheck },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function ReviewsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({ type: "mdt_weekly", scheduled_date: "", notes: "", center_id: "" });
  const [newAction, setNewAction] = useState({ description: "", deadline: "", owner_user_id: "" });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["review_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_sessions")
        .select("*")
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: actionItems } = useQuery({
    queryKey: ["review_action_items", selectedReview],
    enabled: !!selectedReview,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_action_items")
        .select("*")
        .eq("review_id", selectedReview!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("review_sessions").insert({
        type: newReview.type,
        scheduled_date: newReview.scheduled_date,
        notes: newReview.notes || null,
        center_id: newReview.center_id || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review_sessions"] });
      setDialogOpen(false);
      setNewReview({ type: "mdt_weekly", scheduled_date: "", notes: "", center_id: "" });
      toast.success("Review session scheduled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSessionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("review_sessions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review_sessions"] });
      toast.success("Status updated");
    },
  });

  const createActionItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("review_action_items").insert({
        review_id: selectedReview!,
        description: newAction.description,
        deadline: newAction.deadline || null,
        owner_user_id: newAction.owner_user_id || user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review_action_items"] });
      setActionDialogOpen(false);
      setNewAction({ description: "", deadline: "", owner_user_id: "" });
      toast.success("Action item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateActionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("review_action_items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["review_action_items"] }),
  });

  const selectedSession = sessions?.find((s) => s.id === selectedReview);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Reviews</h1>
          <p className="text-sm text-muted-foreground">Schedule and manage MDT, center, and leadership reviews.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Schedule Review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule New Review</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newReview.type} onValueChange={(v) => setNewReview({ ...newReview, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={newReview.scheduled_date} onChange={(e) => setNewReview({ ...newReview, scheduled_date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Center (optional)</label>
                <Select value={newReview.center_id} onValueChange={(v) => setNewReview({ ...newReview, center_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All centers" /></SelectTrigger>
                  <SelectContent>
                    {branches?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={newReview.notes} onChange={(e) => setNewReview({ ...newReview, notes: e.target.value })} placeholder="Agenda notes..." />
              </div>
              <Button onClick={() => createSession.mutate()} disabled={!newReview.scheduled_date} className="w-full">Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Sessions</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" />Action Items</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading && <p className="text-muted-foreground col-span-full text-center py-8">Loading...</p>}
            {sessions?.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No review sessions scheduled yet.</p>}
            {sessions?.map((session) => {
              const typeInfo = REVIEW_TYPES.find((t) => t.value === session.type);
              const Icon = typeInfo?.icon || CalendarDays;
              return (
                <Card
                  key={session.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedReview === session.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedReview(session.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">{typeInfo?.label || session.type}</CardTitle>
                      </div>
                      <Badge className={STATUS_COLORS[session.status] || ""}>{session.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">{format(new Date(session.scheduled_date), "PPP")}</p>
                    {session.notes && <p className="text-xs text-muted-foreground line-clamp-2">{session.notes}</p>}
                    <div className="flex gap-1 mt-3">
                      {session.status === "scheduled" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); updateSessionStatus.mutate({ id: session.id, status: "in_progress" }); }}>Start</Button>
                      )}
                      {session.status === "in_progress" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); updateSessionStatus.mutate({ id: session.id, status: "completed" }); }}>Complete</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="actions">
          {!selectedReview ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a review session to see its action items.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Action Items — {REVIEW_TYPES.find((t) => t.value === selectedSession?.type)?.label}</CardTitle>
                <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Action Item</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Deadline</label>
                        <Input type="date" value={newAction.deadline} onChange={(e) => setNewAction({ ...newAction, deadline: e.target.value })} />
                      </div>
                      <Button onClick={() => createActionItem.mutate()} disabled={!newAction.description} className="w-full">Add Action Item</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {actionItems?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No action items yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actionItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.deadline ? format(new Date(item.deadline), "PP") : "—"}</TableCell>
                          <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {item.status === "pending" && (
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateActionStatus.mutate({ id: item.id, status: "in_progress" })}>Start</Button>
                              )}
                              {item.status === "in_progress" && (
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateActionStatus.mutate({ id: item.id, status: "completed" })}>Done</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
