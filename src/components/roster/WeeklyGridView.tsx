import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isSameDay, parseISO } from "date-fns";
import FairnessSummary from "./FairnessSummary";

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
  shift_templates: { name: string; start_time: string; end_time: string; color: string | null } | null;
}

interface LeaveRequest {
  employee_id: string;
  start_date: string;
  end_date: string;
}

interface Props {
  employees: Employee[];
  assignments: Assignment[];
  weekDays: Date[];
  leaves: LeaveRequest[];
  onCellClick: (employeeId: string, date: Date, existingAssignment?: Assignment) => void;
}

function isOnLeave(empId: string, day: Date, leaves: LeaveRequest[]): boolean {
  return leaves.some(
    (l) => l.employee_id === empId && day >= parseISO(l.start_date) && day <= parseISO(l.end_date)
  );
}

export default function WeeklyGridView({ employees, assignments, weekDays, leaves, onCellClick }: Props) {
  const assignmentMap = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    assignments.forEach((a) => {
      const key = `${a.employee_id}_${a.date}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [assignments]);

  const { assigned, unassigned } = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.employee_id));
    return {
      assigned: employees.filter((e) => assignedIds.has(e.id)),
      unassigned: employees.filter((e) => !assignedIds.has(e.id)),
    };
  }, [employees, assignments]);

  const allEmployees = [...assigned, ...unassigned];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="min-w-[180px] sticky left-0 bg-muted/30 z-10">Employee</TableHead>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <TableHead key={day.toISOString()} className={`text-center min-w-[110px] ${isToday ? "bg-primary/5 text-primary font-bold" : ""}`}>
                    <div>{format(day, "EEE")}</div>
                    <div className="text-[10px]">{format(day, "MMM d")}</div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allEmployees.map((emp) => {
              const hasAny = assigned.includes(emp);
              return (
                <TableRow key={emp.id} className={!hasAny ? "bg-warning/5" : ""}>
                  <TableCell className="sticky left-0 bg-background z-10 border-r">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{emp.departments?.name || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  {weekDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const key = `${emp.id}_${dateStr}`;
                    const cellAssignments = assignmentMap[key] || [];
                    const onLeave = isOnLeave(emp.id, day, leaves);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <TableCell
                        key={day.toISOString()}
                        className={`text-center p-1.5 cursor-pointer hover:bg-muted/50 transition-colors ${isToday ? "bg-primary/5" : ""}`}
                        onClick={() => onCellClick(emp.id, day, cellAssignments[0])}
                      >
                        {onLeave ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-destructive/30 text-destructive bg-destructive/5">
                            Leave
                          </Badge>
                        ) : cellAssignments.length > 0 ? (
                          <div className="space-y-1">
                            {cellAssignments.map((a) => (
                              <Badge
                                key={a.id}
                                className="text-[10px] px-1.5 py-0.5 block w-fit mx-auto"
                                style={{
                                  backgroundColor: (a.shift_templates?.color || "hsl(var(--primary))") + "20",
                                  color: a.shift_templates?.color || "hsl(var(--primary))",
                                  borderColor: (a.shift_templates?.color || "hsl(var(--primary))") + "40",
                                }}
                                variant="outline"
                              >
                                {a.shift_templates?.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Fairness Summary */}
      <FairnessSummary
        employees={employees}
        assignments={assignments as any}
        weekDays={weekDays}
      />
    </div>
  );
}
