import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Bell, Clock, CheckCircle2, Plus, Shield, XCircle, Zap } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useEffect } from "react";

const severityColors: Record<string, string> = {
  L1: "bg-info/15 text-info border-info/25",
  L2: "bg-warning/15 text-warning border-warning/25",
  L3: "bg-destructive/15 text-destructive border-destructive/25",
};

const statusMap: Record<string, "pending" | "warning" | "success" | "overdue" | "escalated" | "info"> = {
  triggered: "overdue",
  acknowledged: "warning",
  in_progress: "pending",
  resolved: "success",
  escalated: "escalated",
  closed: "info",
};

export default function AlertDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");

  const { data: alertTypes } = useQuery({
    queryKey: ["alert_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alert_types").select("*").eq("is_active", true).order("severity_level", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ["alerts", activeTab],
    queryFn: async () => {
      let query = supabase.from("alerts").select("*, alert_types(name, code, severity_level, category, default_response_sla_minutes)").order("triggered_at", { ascending: false });
      if (activeTab === "active") {
        query = query.in("status", ["triggered", "acknowledged", "in_progress", "escalated"]);
      } else {
        query = query.in("status", ["resolved", "closed"]);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for alerts
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        refetchAlerts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchAlerts]);

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from("alerts").update({
        status: "acknowledged" as any,
        acknowledged_at: new Date().toISOString(),
        current_assignee_id: user?.id,
      }).eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alert acknowledged"); queryClient.invalidateQueries({ queryKey: ["alerts"] }); },
  });

  const resolveAlert = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const { error } = await supabase.from("alerts").update({
        status: "resolved" as any,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      }).eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alert resolved"); queryClient.invalidateQueries({ queryKey: ["alerts"] }); },
  });

  const activeCount = alerts?.filter(a => ["triggered", "acknowledged", "in_progress", "escalated"].includes(a.status)).length || 0;
  const l3Count = alerts?.filter(a => (a.alert_types as any)?.severity_level === "L3" && ["triggered", "acknowledged", "in_progress"].includes(a.status)).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alert Dashboard</h1>
          <p className="text-sm text-muted-foreground">Clinical & operational alert management with SOP tracking</p>
        </div>
        <TriggerAlertDialog alertTypes={alertTypes || []} userId={user?.id || ""} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={l3Count > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center">
              <Zap className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{l3Count}</p>
              <p className="text-xs text-muted-foreground">Critical (L3)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {alerts?.filter(a => a.status === "triggered").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Awaiting Response</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {alerts?.filter(a => a.status === "resolved" || a.status === "closed").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />Active
            {activeCount > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{activeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {alerts?.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No {activeTab} alerts</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {alerts?.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => acknowledgeAlert.mutate(alert.id)}
                  onResolve={(notes) => resolveAlert.mutate({ alertId: alert.id, notes })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge, onResolve }: { alert: any; onAcknowledge: () => void; onResolve: (notes: string) => void }) {
  const [showSop, setShowSop] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolve, setShowResolve] = useState(false);
  const alertType = alert.alert_types as any;
  const isActive = ["triggered", "acknowledged", "in_progress", "escalated"].includes(alert.status);
  const slaMinutes = alertType?.default_response_sla_minutes || 30;
  const elapsed = Math.round((Date.now() - new Date(alert.triggered_at).getTime()) / 60000);
  const slaBreach = elapsed > slaMinutes && alert.status === "triggered";

  return (
    <Card className={`transition-all ${slaBreach ? "border-destructive/50 animate-pulse" : ""}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${severityColors[alertType?.severity_level || "L1"]}`}>
                {alertType?.severity_level}
              </span>
              <StatusChip status={statusMap[alert.status] || "pending"} label={alert.status.replace("_", " ")} />
              <Badge variant="outline" className="text-[10px]">{alertType?.category}</Badge>
              {slaBreach && <Badge variant="destructive" className="text-[10px] animate-pulse">SLA BREACHED</Badge>}
            </div>
            <h3 className="font-semibold">{alertType?.name || "Alert"}</h3>
            {alert.description && <p className="text-sm text-muted-foreground">{alert.description}</p>}
            {alert.patient_reference && <p className="text-xs text-muted-foreground">Patient: {alert.patient_reference}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Triggered {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}</span>
              {alert.acknowledged_at && <span>Ack'd {formatDistanceToNow(new Date(alert.acknowledged_at), { addSuffix: true })}</span>}
              {alert.resolved_at && <span>Resolved {formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true })}</span>}
            </div>
          </div>
          {isActive && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowSop(!showSop)}>
                <Shield className="h-3.5 w-3.5 mr-1" />SOP
              </Button>
              {alert.status === "triggered" && (
                <Button size="sm" variant="default" onClick={onAcknowledge}>Acknowledge</Button>
              )}
              {["acknowledged", "in_progress"].includes(alert.status) && (
                <Button size="sm" variant="default" onClick={() => setShowResolve(!showResolve)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolve
                </Button>
              )}
            </div>
          )}
        </div>
        {showSop && <SopChecklist alertId={alert.id} alertTypeId={alert.alert_type_id} />}
        {showResolve && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <Textarea placeholder="Resolution notes..." value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} />
            <Button size="sm" onClick={() => { onResolve(resolveNotes); setShowResolve(false); }}>Confirm Resolution</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SopChecklist({ alertId, alertTypeId }: { alertId: string; alertTypeId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: steps } = useQuery({
    queryKey: ["sop_steps", alertTypeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("alert_sop_templates").select("*").eq("alert_type_id", alertTypeId).order("step_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: completions } = useQuery({
    queryKey: ["sop_completions", alertId],
    queryFn: async () => {
      const { data, error } = await supabase.from("alert_sop_completions").select("*").eq("alert_id", alertId);
      if (error) throw error;
      return data;
    },
  });

  const completeStep = async (stepId: string) => {
    const { error } = await supabase.from("alert_sop_completions").insert({
      alert_id: alertId,
      sop_step_id: stepId,
      completed_by: user?.id || "",
    });
    if (error) { toast.error("Failed to complete step"); return; }
    toast.success("Step completed");
    queryClient.invalidateQueries({ queryKey: ["sop_completions", alertId] });
  };

  const completedIds = new Set(completions?.map(c => c.sop_step_id));

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 text-primary" />SOP Checklist
      </h4>
      <div className="space-y-2">
        {steps?.map(step => {
          const done = completedIds.has(step.id);
          return (
            <div key={step.id} className={`flex items-start gap-3 p-2 rounded-lg ${done ? "bg-success/5" : "bg-muted/30"}`}>
              <Checkbox checked={done} disabled={done} onCheckedChange={() => completeStep(step.id)} className="mt-0.5" />
              <div className="flex-1">
                <p className={`text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
                  {step.step_number}. {step.instruction}
                </p>
                {step.expected_duration_minutes && (
                  <p className="text-[10px] text-muted-foreground">Est. {step.expected_duration_minutes} min</p>
                )}
              </div>
              {step.is_mandatory && !done && <Badge variant="outline" className="text-[10px] shrink-0">Required</Badge>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {completedIds.size}/{steps?.length || 0} steps completed
      </p>
    </div>
  );
}

function TriggerAlertDialog({ alertTypes, userId }: { alertTypes: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [patientRef, setPatientRef] = useState("");
  const queryClient = useQueryClient();

  const handleTrigger = async () => {
    if (!typeId) return;
    const alertType = alertTypes.find(t => t.id === typeId);
    const { error } = await supabase.from("alerts").insert({
      alert_type_id: typeId,
      triggered_by: userId,
      severity: alertType?.severity_level || "L1",
      description: description || null,
      patient_reference: patientRef || null,
    });
    if (error) { toast.error("Failed to trigger alert"); return; }
    toast.success("Alert triggered");
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    setOpen(false);
    setDescription("");
    setPatientRef("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <AlertTriangle className="h-4 w-4" />Trigger Alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Trigger Alert</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger><SelectValue placeholder="Select alert type" /></SelectTrigger>
            <SelectContent>
              {alertTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block w-6 text-center rounded text-[10px] font-bold ${severityColors[t.severity_level]}`}>{t.severity_level}</span>
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Patient Reference (optional)" value={patientRef} onChange={e => setPatientRef(e.target.value)} />
          <Textarea placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)} />
          <Button variant="destructive" onClick={handleTrigger} className="w-full">Trigger Alert</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
