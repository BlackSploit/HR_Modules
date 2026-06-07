import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { format, addDays, eachDayOfInterval, startOfDay } from "date-fns";

export function LeaveForecastingView() {
  const year = new Date().getFullYear();

  // All balances
  const { data: allBalances, isLoading: balLoading } = useQuery({
    queryKey: ["all-leave-balances", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances")
        .select("*, employees(first_name, last_name, department_id, departments(name)), leave_types(name, code)")
        .eq("year", year);
      return data || [];
    },
  });

  // Future approved leaves (next 90 days)
  const today = startOfDay(new Date());
  const futureEnd = addDays(today, 90);

  const { data: futureLeaves, isLoading: leaveLoading } = useQuery({
    queryKey: ["future-leaves", format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, employees(first_name, last_name, department_id, departments(name)), leave_types(name, code)")
        .in("status", ["approved", "pending"])
        .gte("start_date", format(today, "yyyy-MM-dd"))
        .lte("start_date", format(futureEnd, "yyyy-MM-dd"))
        .order("start_date");
      return data || [];
    },
  });

  // Depletion alerts: employees who will exhaust balances within 30/60/90 days based on current usage rate
  const depletionAlerts = useMemo(() => {
    if (!allBalances?.length) return [];
    const alerts: { name: string; dept: string; leaveType: string; remaining: number; daysToDepletion: number }[] = [];

    allBalances.forEach((b: any) => {
      const remaining = b.total_days - Number(b.used_days);
      if (remaining <= 0) {
        alerts.push({
          name: `${b.employees?.first_name} ${b.employees?.last_name}`,
          dept: b.employees?.departments?.name || "-",
          leaveType: b.leave_types?.code || "",
          remaining,
          daysToDepletion: 0,
        });
      } else if (remaining <= 3) {
        alerts.push({
          name: `${b.employees?.first_name} ${b.employees?.last_name}`,
          dept: b.employees?.departments?.name || "-",
          leaveType: b.leave_types?.code || "",
          remaining,
          daysToDepletion: 30,
        });
      }
    });

    return alerts.sort((a, b) => a.remaining - b.remaining);
  }, [allBalances]);

  // Overlap heatmap: department-wise leave density for next 90 days
  const heatmapData = useMemo(() => {
    if (!futureLeaves?.length) return [];
    const deptDateMap = new Map<string, Map<string, number>>();

    futureLeaves.forEach((l: any) => {
      const dept = l.employees?.departments?.name || "Unknown";
      if (!deptDateMap.has(dept)) deptDateMap.set(dept, new Map());
      const start = new Date(l.start_date) < today ? today : new Date(l.start_date);
      const end = new Date(l.end_date) > futureEnd ? futureEnd : new Date(l.end_date);
      try {
        eachDayOfInterval({ start, end }).forEach((d) => {
          const key = format(d, "yyyy-MM-dd");
          const m = deptDateMap.get(dept)!;
          m.set(key, (m.get(key) || 0) + 1);
        });
      } catch {}
    });

    const result: { dept: string; peakDate: string; peakCount: number; totalLeaveDays: number }[] = [];
    deptDateMap.forEach((dateMap, dept) => {
      let peak = 0, peakDate = "";
      let total = 0;
      dateMap.forEach((count, date) => {
        total += count;
        if (count > peak) { peak = count; peakDate = date; }
      });
      result.push({ dept, peakDate, peakCount: peak, totalLeaveDays: total });
    });

    return result.sort((a, b) => b.peakCount - a.peakCount);
  }, [futureLeaves, today, futureEnd]);

  if (balLoading || leaveLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Depletion Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Balance Depletion Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!depletionAlerts.length ? (
            <p className="text-sm text-muted-foreground">No employees at risk of balance exhaustion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depletionAlerts.slice(0, 20).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.dept}</TableCell>
                    <TableCell><Badge variant="outline">{a.leaveType}</Badge></TableCell>
                    <TableCell className={a.remaining <= 0 ? "text-destructive font-bold" : "text-amber-600 font-semibold"}>
                      {a.remaining}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.remaining <= 0 ? "destructive" : "secondary"}>
                        {a.remaining <= 0 ? "Exhausted" : "Low"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dept Overlap Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Department Leave Density (Next 90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!heatmapData.length ? (
            <p className="text-sm text-muted-foreground">No upcoming leaves found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Total Leave-Days</TableHead>
                  <TableHead>Peak Day</TableHead>
                  <TableHead>Peak Count</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heatmapData.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{h.dept}</TableCell>
                    <TableCell>{h.totalLeaveDays}</TableCell>
                    <TableCell className="text-sm">{h.peakDate ? format(new Date(h.peakDate), "MMM d") : "-"}</TableCell>
                    <TableCell>{h.peakCount}</TableCell>
                    <TableCell>
                      {h.peakCount >= 3 ? (
                        <Badge variant="destructive">High</Badge>
                      ) : h.peakCount >= 2 ? (
                        <Badge variant="secondary">Medium</Badge>
                      ) : (
                        <Badge variant="outline">Low</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Leaves Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Upcoming Approved Leaves
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!futureLeaves?.length ? (
            <EmptyState icon={Calendar} title="No upcoming leaves" description="No approved/pending leaves in the next 90 days." />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {futureLeaves.slice(0, 25).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div>
                    <span className="font-medium">{l.employees?.first_name} {l.employees?.last_name}</span>
                    <span className="text-muted-foreground ml-2">{l.employees?.departments?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{l.leave_types?.code}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(l.start_date), "MMM d")} – {format(new Date(l.end_date), "MMM d")}
                    </span>
                    <Badge variant={l.status === "approved" ? "default" : "secondary"} className="text-[10px]">{l.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
