import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import { BarChart3, TrendingUp, Target, Plus, Activity, Building2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function KpiDashboardPage() {
  const { user, roles, isAdminOrHR, hasRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const isDirectorView = isAdminOrHR || hasRole("center_head") || hasRole("clinical_lead");

  const { data: kpiDefs } = useQuery({
    queryKey: ["kpi_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_definitions").select("*").eq("is_active", true).order("role");
      if (error) throw error;
      return data;
    },
  });

  const { data: kpiEntries } = useQuery({
    queryKey: ["kpi_entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_entries").select("*, kpi_definitions(name, code, target_value, unit, role)").order("date", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: centers } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const roleGroups = kpiDefs?.reduce((acc, def) => {
    if (!acc[def.role]) acc[def.role] = [];
    acc[def.role].push(def);
    return acc;
  }, {} as Record<string, typeof kpiDefs>) || {};

  const filteredRoles = selectedRole === "all" ? Object.keys(roleGroups) : [selectedRole];

  // Compute summary stats for command dashboard
  const getKpiStatus = (value: number, target: number) => {
    const pct = target > 0 ? (value / target) * 100 : 0;
    if (pct >= 90) return "success";
    if (pct >= 70) return "warning";
    return "overdue";
  };

  // Aggregate for command dashboard chart
  const chartData = Object.entries(roleGroups).map(([role, defs]) => {
    const roleEntries = kpiEntries?.filter(e => (e.kpi_definitions as any)?.role === role) || [];
    const avgScore = roleEntries.length > 0
      ? roleEntries.reduce((sum, e) => {
          const target = (e.kpi_definitions as any)?.target_value || 1;
          return sum + Math.min((e.value / target) * 100, 100);
        }, 0) / roleEntries.length
      : 0;
    return { role: role.replace(/_/g, " "), score: Math.round(avgScore) };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isDirectorView ? "Master Command Dashboard — All centers & roles" : "Your performance metrics"}
          </p>
        </div>
        <div className="flex gap-2">
          {isDirectorView && (
            <>
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Centers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {centers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.keys(roleGroups).map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <KpiEntryDialog kpiDefs={kpiDefs || []} userId={user?.id || ""} />
        </div>
      </div>

      {isDirectorView && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Performance Overview by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="role" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.score >= 90 ? "hsl(var(--success))" : entry.score >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {filteredRoles.map(role => (
          <div key={role} className="space-y-3">
            <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {role.replace(/_/g, " ")} KPIs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {roleGroups[role]?.map(def => {
                const latestEntry = kpiEntries?.find(e => e.kpi_definition_id === def.id);
                const value = latestEntry?.value ?? 0;
                const status = getKpiStatus(value, def.target_value);
                return (
                  <Card key={def.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-muted-foreground leading-tight">{def.name}</p>
                        <StatusChip status={status} label={status === "success" ? "On Track" : status === "warning" ? "At Risk" : "Critical"} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{value}</span>
                        <span className="text-sm text-muted-foreground">/ {def.target_value} {def.unit}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((value / def.target_value) * 100, 100)}%`,
                            backgroundColor: status === "success" ? "hsl(var(--success))" : status === "warning" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground capitalize">{def.frequency} • {latestEntry ? format(new Date(latestEntry.date), "MMM d") : "No data"}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiEntryDialog({ kpiDefs, userId }: { kpiDefs: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!selectedKpi || !value) return;
    const { error } = await supabase.from("kpi_entries").insert({
      kpi_definition_id: selectedKpi,
      user_id: userId,
      value: parseFloat(value),
      notes: notes || null,
      created_by: userId,
    });
    if (error) { toast.error("Failed to record KPI entry"); return; }
    toast.success("KPI entry recorded");
    setOpen(false);
    setValue("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Log Entry</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record KPI Entry</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={selectedKpi} onValueChange={setSelectedKpi}>
            <SelectTrigger><SelectValue placeholder="Select KPI" /></SelectTrigger>
            <SelectContent>
              {kpiDefs.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name} ({d.role.replace(/_/g, " ")})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} />
          <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <Button onClick={handleSubmit} className="w-full">Submit Entry</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
