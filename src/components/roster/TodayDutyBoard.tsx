import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, UserX, AlertTriangle, CalendarOff } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import RoleMixPanel from "./RoleMixPanel";

interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
  departments: { name: string } | null;
}

interface Assignment {
  id: string;
  employee_id: string;
  shift_template_id: string;
  date: string;
  status: string;
  employees: { id: string; first_name: string; last_name: string; department_id: string | null } | null;
  shift_templates: { name: string; start_time: string; end_time: string; color: string | null } | null;
}

interface LeaveRequest {
  employee_id: string;
  start_date: string;
  end_date: string;
}

interface AttendanceRecord {
  employee_id: string;
  clock_in: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Props {
  assignments: Assignment[];
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  leaves: LeaveRequest[];
  selectedDate: Date;
  weekDays: Date[];
  onDateChange: (date: Date) => void;
  onAssignClick?: () => void;
  attendanceRecords?: AttendanceRecord[];
  departments?: Department[];
}

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

function isOnLeaveOnDate(empId: string, leaves: LeaveRequest[], date: Date): boolean {
  return leaves.some(
    (l) => l.employee_id === empId && date >= parseISO(l.start_date) && date <= parseISO(l.end_date)
  );
}

function getAttendanceDot(empId: string, shiftStart: string, isToday: boolean, records: AttendanceRecord[]): string | null {
  if (!isToday) return null;
  const record = records.find((r) => r.employee_id === empId);
  if (record?.clock_in) return "bg-success"; // clocked in
  const now = new Date();
  const [sh, sm] = shiftStart.split(":").map(Number);
  const shiftStartMin = sh * 60 + sm;
  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (currentMin > shiftStartMin + 15) return "bg-destructive"; // late/absent
  return "bg-muted-foreground/40"; // not started yet
}

export default function TodayDutyBoard({
  assignments, employees, shiftTemplates, leaves, selectedDate, weekDays, onDateChange, onAssignClick,
  attendanceRecords = [], departments = [],
}: Props) {
  const isToday = isSameDay(selectedDate, new Date());

  const dateAssignments = useMemo(
    () => assignments.filter((a) => isSameDay(new Date(a.date + "T00:00:00"), selectedDate)),
    [assignments, selectedDate]
  );

  const assignedIds = useMemo(() => new Set(dateAssignments.map((a) => a.employee_id)), [dateAssignments]);
  const onLeaveIds = useMemo(() => new Set(employees.filter((e) => isOnLeaveOnDate(e.id, leaves, selectedDate)).map((e) => e.id)), [employees, leaves, selectedDate]);
  const unassignedEmployees = useMemo(
    () => employees.filter((e) => !assignedIds.has(e.id) && !onLeaveIds.has(e.id)),
    [employees, assignedIds, onLeaveIds]
  );

  const shiftGroups = useMemo(() => {
    const groups: Record<string, { template: ShiftTemplate; employees: Assignment[] }> = {};
    dateAssignments.forEach((a) => {
      const key = a.shift_template_id;
      if (!groups[key]) {
        const tpl = shiftTemplates.find((s) => s.id === key);
        if (!tpl) return;
        groups[key] = { template: tpl, employees: [] };
      }
      groups[key].employees.push(a);
    });
    return Object.values(groups).sort((a, b) => a.template.start_time.localeCompare(b.template.start_time));
  }, [dateAssignments, shiftTemplates]);

  return (
    <div className="space-y-4">
      {/* Day Picker Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isSameDay(day, new Date());
          return (
            <Button
              key={day.toISOString()}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={`flex flex-col items-center min-w-[52px] h-auto py-1.5 px-2 ${isDayToday && !isSelected ? "border-primary/50" : ""}`}
              onClick={() => onDateChange(day)}
            >
              <span className="text-[10px] uppercase">{format(day, "EEE")}</span>
              <span className="text-sm font-bold">{format(day, "d")}</span>
            </Button>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Duty Board — {format(selectedDate, "EEE, MMM d")}
          {isToday && <Badge variant="secondary" className="ml-2 text-[10px] bg-primary/10 text-primary">TODAY</Badge>}
        </h2>
      </div>

      {dateAssignments.length === 0 && onLeaveIds.size === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No shifts assigned"
          description={`No staff are scheduled for ${format(selectedDate, "EEEE, MMM d")}. Assign shifts to see them here.`}
          actionLabel={onAssignClick ? "Assign Shifts" : undefined}
          onAction={onAssignClick}
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dateAssignments.length}</p>
                  <p className="text-xs text-muted-foreground">On Duty</p>
                </div>
              </CardContent>
            </Card>
            {shiftGroups.map((sg) => {
              const active = isToday && isCurrentShift(sg.template.start_time, sg.template.end_time);
              return (
                <Card key={sg.template.id} className={active ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : ""}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (sg.template.color || "hsl(var(--primary))") + "20" }}>
                      <Clock className="h-5 w-5" style={{ color: sg.template.color || "hsl(var(--primary))" }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sg.employees.length}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {sg.template.name}
                        {active && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1 bg-primary/10 text-primary">LIVE</Badge>}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Card className={unassignedEmployees.length > 0 ? "border-warning/40 bg-warning/5" : ""}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unassignedEmployees.length}</p>
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shift Swimlanes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shiftGroups.map((sg) => {
              const active = isToday && isCurrentShift(sg.template.start_time, sg.template.end_time);
              return (
                <Card key={sg.template.id} className={active ? "border-primary/30 shadow-md" : ""}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sg.template.color || "hsl(var(--primary))" }} />
                        <CardTitle className="text-sm font-semibold">{sg.template.name}</CardTitle>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sg.template.start_time.slice(0, 5)}–{sg.template.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {sg.employees.map((a: any) => {
                        const dot = getAttendanceDot(a.employee_id, sg.template.start_time, isToday, attendanceRecords);
                        return (
                          <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 text-sm">
                            <div className="relative">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {a.employees?.first_name?.[0]}{a.employees?.last_name?.[0]}
                              </div>
                              {dot && (
                                <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${dot}`} />
                              )}
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
                    {employees.filter((e) => onLeaveIds.has(e.id)).map((e) => (
                      <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-sm">
                        <span className="font-medium text-destructive">{e.first_name} {e.last_name?.[0]}.</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Role-Mix Coverage Panel */}
          {departments.length > 0 && (
            <RoleMixPanel
              assignments={dateAssignments as any}
              departments={departments}
            />
          )}

          {unassignedEmployees.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm font-semibold text-warning flex items-center gap-2">
                  <UserX className="h-4 w-4" /> Unassigned Staff ({unassignedEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {unassignedEmployees.map((e) => (
                    <Badge key={e.id} variant="outline" className="border-warning/30 text-warning bg-warning/5">
                      {e.first_name} {e.last_name} {e.departments ? `• ${e.departments.name}` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
