import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const reviewTypes = ["day_7", "day_30", "day_60", "day_90"];
const outcomes = ["on_track", "concern", "extend", "confirm", "separate"];

export default function ProbationTrackerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", review_type: "day_30", attendance_score: 0,
    competency_score: 0, behavior_score: 0, overall_assessment: "", outcome: "on_track", notes: "",
  });

  const { data: probationEmployees = [] } = useQuery({
    queryKey: ["probation_employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees")
        .select("id, first_name, last_name, date_of_joining, departments(name), designations(title)")
        .eq("status", "probation")
        .order("date_of_joining", { ascending: false });
      return data || [];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["probation_reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("probation_reviews")
        .select("*, employees(first_name, last_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!form.employee_id) { toast({ title: "Select an employee", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("probation_reviews").insert({
      ...form,
      attendance_score: form.attendance_score || null,
      competency_score: form.competency_score || null,
      behavior_score: form.behavior_score || null,
      reviewer_id: user!.id,
      reviewed_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review submitted" });
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["probation_reviews"] });

    // If confirmed, update employee status
    if (form.outcome === "confirm") {
      await supabase.from("employees").update({ status: "active" }).eq("id", form.employee_id);
      queryClient.invalidateQueries({ queryKey: ["probation_employees"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/recruitment")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Probation Tracker</h1>
          <p className="text-sm text-muted-foreground">Track and review employees on probation</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Review</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{probationEmployees.length}</p>
            <p className="text-sm text-muted-foreground">On Probation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{reviews.filter((r: any) => r.outcome === "on_track").length}</p>
            <p className="text-sm text-muted-foreground">On Track</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{reviews.filter((r: any) => r.outcome === "concern").length}</p>
            <p className="text-sm text-muted-foreground">Concerns</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Employees on Probation</CardTitle></CardHeader>
        <CardContent className="p-0">
          {probationEmployees.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No employees on probation</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Reviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {probationEmployees.map((e: any) => {
                  const empReviews = reviews.filter((r: any) => r.employee_id === e.id);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                      <TableCell>{e.departments?.name || "—"}</TableCell>
                      <TableCell>{e.date_of_joining || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {reviewTypes.map(rt => {
                            const done = empReviews.some((r: any) => r.review_type === rt);
                            return <Badge key={rt} variant={done ? "default" : "secondary"} className="text-xs">{rt.replace("day_","D")}</Badge>;
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Reviews</CardTitle></CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No reviews yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scores (A/C/B)</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.slice(0, 20).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</TableCell>
                    <TableCell className="capitalize">{r.review_type.replace("_"," ")}</TableCell>
                    <TableCell>{r.attendance_score || "—"}/{r.competency_score || "—"}/{r.behavior_score || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.outcome === "on_track" || r.outcome === "confirm" ? "default" : r.outcome === "separate" ? "destructive" : "secondary"} className="capitalize">
                        {r.outcome.replace("_"," ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Probation Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {probationEmployees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review Type</Label>
              <Select value={form.review_type} onValueChange={(v) => setForm({ ...form, review_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{reviewTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Attendance</Label><Input type="number" min={0} max={10} value={form.attendance_score} onChange={(e) => setForm({ ...form, attendance_score: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Competency</Label><Input type="number" min={0} max={10} value={form.competency_score} onChange={(e) => setForm({ ...form, competency_score: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Behavior</Label><Input type="number" min={0} max={10} value={form.behavior_score} onChange={(e) => setForm({ ...form, behavior_score: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div>
              <Label>Outcome</Label>
              <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{outcomes.map(o => <SelectItem key={o} value={o} className="capitalize">{o.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Submit Review"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
