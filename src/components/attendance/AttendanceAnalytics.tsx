import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export function AttendanceAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const monthStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");

  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  // Late trends (rolling 30 days)
  const { data: lateRecords } = useQuery({
    queryKey: ["late-trends", thirtyDaysAgo],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, employees(first_name, last_name, departments(name))")
        .eq("status", "late")
        .gte("date", thirtyDaysAgo)
        .lte("date", today);
      return data || [];
    },
  });

  // Absence patterns (rolling 30 days)
  const { data: absentRecords } = useQuery({
    queryKey: ["absence-patterns", thirtyDaysAgo],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, status, employees(first_name, last_name, departments(name))")
        .in("status", ["absent", "on_leave"])
        .gte("date", thirtyDaysAgo)
        .lte("date", today);
      return data || [];
    },
  });

  // Missed punches (clock_in but no clock_out in last 30 days)
  const { data: missedPunches } = useQuery({
    queryKey: ["missed-punches", thirtyDaysAgo],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, date, clock_in, clock_out, employees(first_name, last_name)")
        .not("clock_in", "is", null)
        .is("clock_out", null)
        .gte("date", thirtyDaysAgo)
        .lte("date", today)
        .order("date", { ascending: false });
      return data || [];
    },
  });

  // Department summary for selected month
  const { data: monthRecords } = useQuery({
    queryKey: ["dept-summary", monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, status, employees(department_id, departments(name))")
        .gte("date", monthStart)
        .lte("date", monthEnd);
      return data || [];
    },
  });

  // Compute late trend aggregation
  const lateCounts = new Map<string, { name: string; dept: string; count: number }>();
  lateRecords?.forEach((r: any) => {
    const key = r.employee_id;
    const existing = lateCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      lateCounts.set(key, {
        name: `${r.employees?.first_name || ""} ${r.employees?.last_name || ""}`.trim(),
        dept: r.employees?.departments?.name || "—",
        count: 1,
      });
    }
  });
  const lateTrends = Array.from(lateCounts.values()).filter((e) => e.count >= 3).sort((a, b) => b.count - a.count);

  // Absence aggregation
  const absCounts = new Map<string, { name: string; dept: string; count: number }>();
  absentRecords?.forEach((r: any) => {
    const key = r.employee_id;
    const existing = absCounts.get(key);
    if (existing) existing.count++;
    else absCounts.set(key, { name: `${r.employees?.first_name || ""} ${r.employees?.last_name || ""}`.trim(), dept: r.employees?.departments?.name || "—", count: 1 });
  });
  const absencePatterns = Array.from(absCounts.values()).filter((e) => e.count >= 3).sort((a, b) => b.count - a.count);

  // Department summary
  const deptStats = new Map<string, { total: number; present: number; absent: number; late: number }>();
  monthRecords?.forEach((r: any) => {
    const dept = r.employees?.departments?.name || "Unknown";
    if (!deptStats.has(dept)) deptStats.set(dept, { total: 0, present: 0, absent: 0, late: 0 });
    const s = deptStats.get(dept)!;
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "absent") s.absent++;
    else if (r.status === "late") s.late++;
  });

  return (
    <div className="space-y-4">
      <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-48" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Late Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" /> Late Trends (30 days, 3+ occurrences)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lateTrends.length ? (
              <div className="space-y-2">
                {lateTrends.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                    <div>
                      <span className="font-medium">{e.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">{e.dept}</span>
                    </div>
                    <Badge variant="destructive" className="text-xs">{e.count} lates</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No employees with 3+ late arrivals</p>
            )}
          </CardContent>
        </Card>

        {/* Absence Patterns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Absence Patterns (30 days, 3+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absencePatterns.length ? (
              <div className="space-y-2">
                {absencePatterns.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                    <div>
                      <span className="font-medium">{e.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">{e.dept}</span>
                    </div>
                    <Badge variant="destructive" className="text-xs">{e.count} absences</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No employees with 3+ absences</p>
            )}
          </CardContent>
        </Card>

        {/* Missed Punches */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Missed Clock-Outs (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missedPunches?.length ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {missedPunches.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm p-1">
                    <span>{r.employees?.first_name} {r.employees?.last_name}</span>
                    <span className="text-muted-foreground text-xs">{format(new Date(r.date), "MMM d")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No missed clock-outs</p>
            )}
          </CardContent>
        </Card>

        {/* Department Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Department Summary ({format(new Date(selectedMonth + "-01"), "MMM yyyy")})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptStats.size ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Records</TableHead>
                    <TableHead className="text-xs">Present%</TableHead>
                    <TableHead className="text-xs">Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(deptStats.entries()).map(([dept, s]) => (
                    <TableRow key={dept}>
                      <TableCell className="text-xs font-medium">{dept}</TableCell>
                      <TableCell className="text-xs">{s.total}</TableCell>
                      <TableCell className="text-xs">{s.total ? `${Math.round((s.present / s.total) * 100)}%` : "—"}</TableCell>
                      <TableCell className="text-xs">{s.late}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No data for this month</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
