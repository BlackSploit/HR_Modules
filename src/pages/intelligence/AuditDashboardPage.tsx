import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Building2, TrendingUp, AlertTriangle, Clock, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";

export default function AuditDashboardPage() {
  const [period, setPeriod] = useState("30");

  const { data: alerts } = useQuery({
    queryKey: ["audit_alerts", period],
    queryFn: async () => {
      const since = subDays(new Date(), parseInt(period)).toISOString();
      const { data, error } = await supabase
        .from("alerts")
        .select("*, alert_types(name, severity_level, category, default_response_sla_minutes, default_resolution_sla_minutes)")
        .gte("triggered_at", since)
        .order("triggered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: centers } = useQuery({
    queryKey: ["branches_audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: auditScores } = useQuery({
    queryKey: ["audit_scores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_scores").select("*").order("overall_compliance_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Compute stats
  const stats = useMemo(() => {
    if (!alerts) return { totalAlerts: 0, avgResponseMin: 0, slaBreach: 0, resolved: 0, severityBreakdown: [], categoryBreakdown: [] };

    const totalAlerts = alerts.length;
    const resolved = alerts.filter(a => a.resolved_at).length;

    // Average response time
    const withResponse = alerts.filter(a => a.acknowledged_at);
    const avgResponseMin = withResponse.length > 0
      ? Math.round(withResponse.reduce((sum, a) => sum + (new Date(a.acknowledged_at!).getTime() - new Date(a.triggered_at).getTime()) / 60000, 0) / withResponse.length)
      : 0;

    // SLA breaches
    const slaBreach = alerts.filter(a => {
      if (!a.acknowledged_at || !a.alert_types) return false;
      const responseMin = (new Date(a.acknowledged_at).getTime() - new Date(a.triggered_at).getTime()) / 60000;
      return responseMin > ((a.alert_types as any)?.default_response_sla_minutes || 30);
    }).length;

    // Severity breakdown
    const sevCounts: Record<string, number> = {};
    alerts.forEach(a => {
      const sev = (a.alert_types as any)?.severity_level || "L1";
      sevCounts[sev] = (sevCounts[sev] || 0) + 1;
    });
    const severityBreakdown = Object.entries(sevCounts).map(([name, value]) => ({ name, value }));

    // Category breakdown
    const catCounts: Record<string, number> = {};
    alerts.forEach(a => {
      const cat = (a.alert_types as any)?.category || "operations";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

    return { totalAlerts, avgResponseMin, slaBreach, resolved, severityBreakdown, categoryBreakdown };
  }, [alerts]);

  const sevColors: Record<string, string> = { L1: "hsl(var(--info))", L2: "hsl(var(--warning))", L3: "hsl(var(--destructive))" };
  const catColors = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--destructive))"];

  const complianceStatus = (score: number) => {
    if (score >= 90) return "success";
    if (score >= 70) return "warning";
    return "overdue";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Compliance</h1>
          <p className="text-sm text-muted-foreground">Response times, SOP compliance, and center ranking</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              <p className="text-xs text-muted-foreground">Total Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgResponseMin}<span className="text-sm font-normal text-muted-foreground">m</span></p>
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.slaBreach > 0 ? "border-destructive/30" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.slaBreach}</p>
              <p className="text-xs text-muted-foreground">SLA Breaches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAlerts > 0 ? Math.round((stats.resolved / stats.totalAlerts) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">Resolution Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alerts by Severity</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.severityBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.severityBreakdown.map((entry, i) => (
                      <Cell key={i} fill={sevColors[entry.name] || "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alerts by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.categoryBreakdown} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {stats.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={catColors[i % catColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center Compliance Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Center Compliance Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditScores && auditScores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center</TableHead>
                  <TableHead>SOP Score</TableHead>
                  <TableHead>Timeliness</TableHead>
                  <TableHead>Documentation</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditScores.map(score => (
                  <TableRow key={score.id}>
                    <TableCell>{centers?.find(c => c.id === score.center_id)?.name || "—"}</TableCell>
                    <TableCell>{score.sop_completion_score}%</TableCell>
                    <TableCell>{score.timeliness_score}%</TableCell>
                    <TableCell>{score.documentation_score}%</TableCell>
                    <TableCell className="font-semibold">{score.overall_compliance_score}%</TableCell>
                    <TableCell>
                      <StatusChip
                        status={complianceStatus(score.overall_compliance_score) as any}
                        label={score.overall_compliance_score >= 90 ? "Compliant" : score.overall_compliance_score >= 70 ? "At Risk" : "Non-Compliant"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No compliance scores recorded yet. Scores are generated from alert response data.</p>
          )}
        </CardContent>
      </Card>

      {/* Alert Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Alert Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Resolution Time</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts?.slice(0, 20).map(alert => {
                  const at = alert.alert_types as any;
                  const responseMin = alert.acknowledged_at
                    ? Math.round((new Date(alert.acknowledged_at).getTime() - new Date(alert.triggered_at).getTime()) / 60000)
                    : null;
                  const resolveMin = alert.resolved_at
                    ? Math.round((new Date(alert.resolved_at).getTime() - new Date(alert.triggered_at).getTime()) / 60000)
                    : null;
                  const breach = responseMin !== null && responseMin > (at?.default_response_sla_minutes || 30);
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{at?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${alert.severity === "L3" ? "border-destructive text-destructive" : alert.severity === "L2" ? "border-warning text-warning" : ""}`}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(alert.triggered_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell className="text-xs">{responseMin !== null ? `${responseMin}m` : "—"}</TableCell>
                      <TableCell className="text-xs">{resolveMin !== null ? `${resolveMin}m` : "—"}</TableCell>
                      <TableCell>{breach ? <Badge variant="destructive" className="text-[10px]">Breached</Badge> : responseMin !== null ? <Badge variant="outline" className="text-[10px] text-success border-success">Met</Badge> : "—"}</TableCell>
                      <TableCell><StatusChip status={alert.status === "resolved" || alert.status === "closed" ? "success" : alert.status === "escalated" ? "escalated" : "pending"} label={alert.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
