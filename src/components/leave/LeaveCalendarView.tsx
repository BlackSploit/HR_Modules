import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";

export function LeaveCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: leaves } = useQuery({
    queryKey: ["calendar-leaves", format(monthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, employees(first_name, last_name, department_id, departments(name)), leave_types(name, code)")
        .in("status", ["approved", "pending"])
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"))
        .gte("end_date", format(monthStart, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // Fetch blackout dates from leave policies
  const { data: policies } = useQuery({
    queryKey: ["leave-policies-blackout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_policies")
        .select("blackout_dates")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Build blackout date set
  const blackoutDates = useMemo(() => {
    const dates = new Set<string>();
    policies?.forEach((p: any) => {
      if (Array.isArray(p.blackout_dates)) {
        p.blackout_dates.forEach((range: any) => {
          if (range.start && range.end) {
            try {
              eachDayOfInterval({ start: new Date(range.start), end: new Date(range.end) }).forEach((d) => {
                dates.add(format(d, "yyyy-MM-dd"));
              });
            } catch {}
          }
        });
      }
    });
    return dates;
  }, [policies]);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  // Build date -> leaves map
  const dateMap = useMemo(() => {
    const map = new Map<string, any[]>();
    leaves?.forEach((leave: any) => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const rangeStart = start < monthStart ? monthStart : start;
      const rangeEnd = end > monthEnd ? monthEnd : end;
      eachDayOfInterval({ start: rangeStart, end: rangeEnd }).forEach((d) => {
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(leave);
      });
    });
    return map;
  }, [leaves, monthStart, monthEnd]);

  // Overlap detection: 3+ from same dept on same day
  const overlaps = useMemo(() => {
    const warnings: { date: string; dept: string; count: number }[] = [];
    dateMap.forEach((dayLeaves, dateKey) => {
      const deptCounts = new Map<string, number>();
      dayLeaves.forEach((l: any) => {
        const dept = l.employees?.departments?.name || "Unknown";
        deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
      });
      deptCounts.forEach((count, dept) => {
        if (count >= 3) warnings.push({ date: dateKey, dept, count });
      });
    });
    return warnings;
  }, [dateMap]);

  return (
    <div className="space-y-3">
      {overlaps.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Coverage Warning:</strong>{" "}
            {overlaps.map((o) => `${o.count} staff from ${o.dept} on ${format(new Date(o.date), "MMM d")}`).join("; ")}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">{format(currentMonth, "MMMM yyyy")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {[...Array(startPadding)].map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayLeaves = dateMap.get(key) || [];
              const isToday = key === format(new Date(), "yyyy-MM-dd");
              const hasOverlap = overlaps.some((o) => o.date === key);
              const isBlackout = blackoutDates.has(key);

              return (
                <div
                  key={key}
                  className={`min-h-[60px] p-1 border rounded-sm text-xs ${isToday ? "border-primary bg-primary/5" : "border-border"} ${hasOverlap ? "bg-destructive/10" : ""} ${isBlackout ? "bg-muted border-dashed" : ""}`}
                >
                  <div className="font-medium mb-0.5 flex items-center gap-0.5">
                    {format(day, "d")}
                    {isBlackout && <span className="text-[8px] text-destructive font-bold">⊘</span>}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeaves.slice(0, 3).map((l: any, i: number) => (
                      <div
                        key={i}
                        className={`truncate text-[9px] px-0.5 rounded ${l.status === "approved" ? "bg-primary/20 text-primary" : "bg-amber-100 text-amber-800"}`}
                        title={`${l.employees?.first_name} ${l.employees?.last_name} - ${l.leave_types?.code}`}
                      >
                        {l.employees?.first_name?.charAt(0)}{l.employees?.last_name?.charAt(0)} {l.leave_types?.code}
                      </div>
                    ))}
                    {dayLeaves.length > 3 && (
                      <div className="text-[9px] text-muted-foreground">+{dayLeaves.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
