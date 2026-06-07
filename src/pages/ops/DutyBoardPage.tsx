import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, Users, UserX, AlertTriangle, CalendarOff, LogIn, LogOut,
  ChevronRight, ArrowRightLeft, UserCheck, UserMinus, Timer, MapPin,
} from "lucide-react";
import { format, isSameDay, parseISO, addDays, startOfWeek } from "date-fns";
import { useGeolocation } from "@/hooks/use-geolocation";

// ─── Helpers ────────────────────────────────────────────
function isCurrentShift(startTime: string, endTime: string): boolean {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (end > start) return current >= start && current < end;
  return current >= start || current < end;
}

function getShiftMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isOnLeaveOnDate(empId: string, leaves: any[], date: Date): boolean {
  return leaves.some(
    (l: any) => l.employee_id === empId && date >= parseISO(l.start_date) && date <= parseISO(l.end_date)
  );
}

// ─── Main Component ─────────────────────────────────────
export default function DutyBoardPage() {
  const { user, isAdminOrHR } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getLocation } = useGeolocation();
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");

  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  // ─── Queries ──────────────────────────
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, department_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: shiftTemplates = [] } = useQuery({
    queryKey: ["shift-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("shift_templates").select("*").eq("is_active", true).order("start_time");
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-duty"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, department_id, departments(name)")
        .eq("status", "active")
        .order("first_name");
      return data || [];
    },
  });

  const { data: todayAssignments = [], isLoading } = useQuery({
    queryKey: ["duty-assignments-today", todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_assignments")
        .select("*, employees(id, first_name, last_name, department_id), shift_templates(name, start_time, end_time, color)")
        .eq("date", todayStr)
        .neq("status", "cancelled");
      return data || [];
    },
  });

  const { data: myWeekAssignments = [] } = useQuery({
    queryKey: ["my-week-assignments", myEmployee?.id, weekStartStr],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data } = await supabase
        .from("roster_assignments")
        .select("*, shift_templates(name, start_time, end_time, color)")
        .eq("employee_id", myEmployee.id)
        .gte("date", weekStartStr)
        .lte("date", weekEndStr)
        .neq("status", "cancelled");
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-today", todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, clock_in, clock_out, status")
        .eq("date", todayStr);
      return data || [];
    },
  });

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["leaves-today", todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("employee_id, start_date, end_date")
        .eq("status", "approved")
        .lte("start_date", todayStr)
        .gte("end_date", todayStr);
      return data || [];
    },
  });

  // ─── Clock In/Out Mutation ────────────
  const clockMutation = useMutation({
    mutationFn: async (action: "in" | "out") => {
      if (!myEmployee?.id) throw new Error("No employee profile");
      const loc = await getLocation();
      const geoFields = { geo_lat: loc?.lat ?? null, geo_lng: loc?.lng ?? null };
      if (action === "in") {
        const { data: existing } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("employee_id", myEmployee.id)
          .eq("date", todayStr)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("attendance_records")
            .update({ clock_in: new Date().toISOString(), status: "present", ...geoFields })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("attendance_records")
            .insert({ employee_id: myEmployee.id, date: todayStr, clock_in: new Date().toISOString(), status: "present", ...geoFields });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("attendance_records")
          .update({ clock_out: new Date().toISOString(), ...geoFields })
          .eq("employee_id", myEmployee.id)
          .eq("date", todayStr);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast({ title: action === "in" ? "Clocked In" : "Clocked Out", description: `Recorded at ${format(new Date(), "HH:mm")}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ─── Derived Data ─────────────────────
  const myTodayAssignment = useMemo(() => {
    if (!myEmployee?.id) return null;
    return todayAssignments.find((a: any) => a.employee_id === myEmployee.id) || null;
  }, [todayAssignments, myEmployee]);

  const myAttendance = useMemo(() => {
    if (!myEmployee?.id) return null;
    return attendanceRecords.find((r: any) => r.employee_id === myEmployee.id) || null;
  }, [attendanceRecords, myEmployee]);

  const assignedIds = useMemo(() => new Set(todayAssignments.map((a: any) => a.employee_id)), [todayAssignments]);
  const onLeaveIds = useMemo(() => new Set(employees.filter((e: any) => isOnLeaveOnDate(e.id, approvedLeaves, today)).map((e: any) => e.id)), [employees, approvedLeaves, today]);
  const unassignedEmployees = useMemo(() => employees.filter((e: any) => !assignedIds.has(e.id) && !onLeaveIds.has(e.id)), [employees, assignedIds, onLeaveIds]);

  const shiftGroups = useMemo(() => {
    const groups: Record<string, { template: any; employees: any[] }> = {};
    todayAssignments.forEach((a: any) => {
      const key = a.shift_template_id;
      if (!groups[key]) {
        const tpl = shiftTemplates.find((s: any) => s.id === key);
        if (!tpl) return;
        groups[key] = { template: tpl, employees: [] };
      }
      groups[key].employees.push(a);
    });
    return Object.values(groups).sort((a, b) => a.template.start_time.localeCompare(b.template.start_time));
  }, [todayAssignments, shiftTemplates]);

  // Attendance pulse
  const attendancePulse = useMemo(() => {
    const presentIds = new Set(attendanceRecords.filter((r: any) => r.clock_in).map((r: any) => r.employee_id));
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let present = 0, late = 0, absent = 0, pending = 0;
    todayAssignments.forEach((a: any) => {
      const rec = attendanceRecords.find((r: any) => r.employee_id === a.employee_id);
      if (rec?.clock_in) {
        const shiftStart = getShiftMinutes(a.shift_templates?.start_time || "00:00");
        const clockInDate = new Date(rec.clock_in);
        const clockInMin = clockInDate.getHours() * 60 + clockInDate.getMinutes();
        if (clockInMin > shiftStart + 15) late++;
        else present++;
      } else {
        const shiftStart = getShiftMinutes(a.shift_templates?.start_time || "00:00");
        if (nowMin > shiftStart + 15) absent++;
        else pending++;
      }
    });
    return { present, late, absent, pending };
  }, [todayAssignments, attendanceRecords]);

  // Handover context
  const handoverContext = useMemo(() => {
    if (!myTodayAssignment?.shift_templates) return null;
    const myStart = getShiftMinutes(myTodayAssignment.shift_templates.start_time);
    const myEnd = getShiftMinutes(myTodayAssignment.shift_templates.end_time);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

    // Only show near shift window (1hr before start to 1hr after end)
    const showWindow = myEnd > myStart
      ? (nowMin >= myStart - 60 && nowMin <= myEnd + 60)
      : (nowMin >= myStart - 60 || nowMin <= myEnd + 60);
    if (!showWindow) return null;

    const previousShift = shiftGroups.find((sg) => {
      const end = getShiftMinutes(sg.template.end_time);
      return Math.abs(end - myStart) <= 30 && sg.template.id !== myTodayAssignment.shift_template_id;
    });
    const nextShift = shiftGroups.find((sg) => {
      const start = getShiftMinutes(sg.template.start_time);
      return Math.abs(start - myEnd) <= 30 && sg.template.id !== myTodayAssignment.shift_template_id;
    });
    return { previousShift, nextShift };
  }, [myTodayAssignment, shiftGroups]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Duty Board</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* ── My Shift + Clock In/Out ── */}
      {myEmployee && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className={myTodayAssignment ? "border-primary/30 bg-primary/5" : ""}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Shift</p>
                  {myTodayAssignment?.shift_templates ? (
                    <>
                      <p className="text-lg font-bold">{myTodayAssignment.shift_templates.name}</p>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{myTodayAssignment.shift_templates.start_time?.slice(0, 5)} – {myTodayAssignment.shift_templates.end_time?.slice(0, 5)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-muted-foreground">No shift assigned</p>
                  )}
                </div>
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: (myTodayAssignment?.shift_templates?.color || "hsl(var(--primary))") + "20" }}
                >
                  <Clock className="h-6 w-6" style={{ color: myTodayAssignment?.shift_templates?.color || "hsl(var(--primary))" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex flex-col justify-center gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attendance</p>
              {myAttendance?.clock_in ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <LogIn className="h-4 w-4 text-primary" />
                    <span>Clocked in at <strong>{format(new Date(myAttendance.clock_in), "HH:mm")}</strong></span>
                  </div>
                  {myAttendance.clock_out ? (
                    <div className="flex items-center gap-2 text-sm">
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      <span>Clocked out at <strong>{format(new Date(myAttendance.clock_out), "HH:mm")}</strong></span>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => clockMutation.mutate("out")} disabled={clockMutation.isPending}>
                      <LogOut className="h-4 w-4 mr-1.5" /> Clock Out
                    </Button>
                  )}
                </div>
              ) : (
                <Button onClick={() => clockMutation.mutate("in")} disabled={clockMutation.isPending} className="w-fit">
                  <LogIn className="h-4 w-4 mr-1.5" /> Clock In
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── My Week Ahead ── */}
      {myEmployee && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">My Week Ahead</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-1.5 overflow-x-auto">
              {weekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const assignment = myWeekAssignments.find((a: any) => a.date === dayStr);
                const onLeave = isOnLeaveOnDate(myEmployee.id, approvedLeaves, day);
                const isDayToday = isSameDay(day, today);
                return (
                  <div
                    key={dayStr}
                    className={`flex flex-col items-center min-w-[64px] rounded-lg p-2 text-center border ${
                      isDayToday ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="text-[10px] uppercase text-muted-foreground">{format(day, "EEE")}</span>
                    <span className="text-sm font-bold">{format(day, "d")}</span>
                    {onLeave ? (
                      <Badge variant="secondary" className="text-[9px] mt-1 bg-destructive/10 text-destructive">Leave</Badge>
                    ) : assignment?.shift_templates ? (
                      <Badge
                        variant="secondary"
                        className="text-[9px] mt-1"
                        style={{ backgroundColor: (assignment.shift_templates.color || "hsl(var(--primary))") + "20", color: assignment.shift_templates.color || "hsl(var(--primary))" }}
                      >
                        {assignment.shift_templates.name}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground mt-1">Off</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Handover Context ── */}
      {handoverContext && (handoverContext.previousShift || handoverContext.nextShift) && (
        <Card className="border-accent/30">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Shift Handover
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {handoverContext.previousShift && (
                <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">Relieving:</span>
                  <div className="flex flex-wrap gap-1">
                    {handoverContext.previousShift.employees.map((a: any) => (
                      <Badge key={a.id} variant="outline" className="text-[10px]">
                        {a.employees?.first_name} {a.employees?.last_name?.[0]}.
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
              {handoverContext.nextShift && (
                <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">Handing to:</span>
                  <div className="flex flex-wrap gap-1">
                    {handoverContext.nextShift.employees.map((a: any) => (
                      <Badge key={a.id} variant="outline" className="text-[10px]">
                        {a.employees?.first_name} {a.employees?.last_name?.[0]}.
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Attendance Pulse (HR/Manager) ── */}
      {isAdminOrHR && todayAssignments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendancePulse.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Timer className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendancePulse.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendancePulse.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendancePulse.pending}</p>
                <p className="text-xs text-muted-foreground">Not Yet In</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Team On Duty ── */}
      {todayAssignments.length === 0 && onLeaveIds.size === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No shifts assigned today"
          description="No staff are scheduled for today. Assign shifts in the Roster page."
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Team On Duty</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shiftGroups.map((sg) => {
              const active = isCurrentShift(sg.template.start_time, sg.template.end_time);
              return (
                <Card key={sg.template.id} className={active ? "border-primary/30 shadow-md" : ""}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sg.template.color || "hsl(var(--primary))" }} />
                        <CardTitle className="text-sm font-semibold">{sg.template.name}</CardTitle>
                        {active && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary">LIVE</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sg.template.start_time?.slice(0, 5)}–{sg.template.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {sg.employees.map((a: any) => {
                        const rec = attendanceRecords.find((r: any) => r.employee_id === a.employee_id);
                        const hasClockedIn = !!rec?.clock_in;
                        const shiftStartMin = getShiftMinutes(sg.template.start_time);
                        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
                        const isLateOrAbsent = !hasClockedIn && nowMin > shiftStartMin + 15;
                        let dotClass = "bg-muted-foreground/40";
                        if (hasClockedIn) dotClass = "bg-emerald-500";
                        else if (isLateOrAbsent) dotClass = "bg-destructive";
                        return (
                          <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 text-sm">
                            <div className="relative">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {a.employees?.first_name?.[0]}{a.employees?.last_name?.[0]}
                              </div>
                              <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${dotClass}`} />
                            </div>
                            <span className="font-medium">{a.employees?.first_name} {a.employees?.last_name?.[0]}.</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {onLeaveIds.size > 0 && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <CardTitle className="text-sm font-semibold text-destructive">On Leave</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {employees.filter((e: any) => onLeaveIds.has(e.id)).map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-sm">
                        <span className="font-medium text-destructive">{e.first_name} {e.last_name?.[0]}.</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unassigned */}
          {isAdminOrHR && unassignedEmployees.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm font-semibold text-warning flex items-center gap-2">
                  <UserX className="h-4 w-4" /> Unassigned Staff ({unassignedEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {unassignedEmployees.map((e: any) => (
                    <Badge key={e.id} variant="outline" className="border-warning/30 text-warning bg-warning/5">
                      {e.first_name} {e.last_name} {e.departments ? `• ${e.departments.name}` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
