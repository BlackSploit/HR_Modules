import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, UserMinus, UserPlus, Clock, Shuffle } from "lucide-react";

interface VarianceBoardProps {
  date: string;
  departmentFilter: string;
}

interface Variance {
  type: "rostered_absent" | "unrostered_present" | "early_departure" | "wrong_shift";
  employeeName: string;
  detail: string;
}

export function VarianceBoard({ date, departmentFilter }: VarianceBoardProps) {
  const { data: rosterAssignments } = useQuery({
    queryKey: ["roster-for-variance", date, departmentFilter],
    queryFn: async () => {
      let q = supabase
        .from("roster_assignments")
        .select("employee_id, shift_template_id, shift_templates(name, start_time, end_time), employees(id, first_name, last_name, department_id)")
        .eq("date", date)
        .eq("status", "scheduled");
      const { data } = await q;
      if (departmentFilter !== "all") {
        return data?.filter((r: any) => r.employees?.department_id === departmentFilter) || [];
      }
      return data || [];
    },
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: ["attendance-for-variance", date, departmentFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, status, clock_in, clock_out, employees(id, first_name, last_name, department_id)")
        .eq("date", date);
      if (departmentFilter !== "all") {
        return data?.filter((r: any) => r.employees?.department_id === departmentFilter) || [];
      }
      return data || [];
    },
  });

  const variances: Variance[] = [];

  if (rosterAssignments && attendanceRecords) {
    const attendanceMap = new Map<string, any>();
    attendanceRecords.forEach((r: any) => attendanceMap.set(r.employee_id, r));

    const rosteredIds = new Set<string>();
    rosterAssignments.forEach((ra: any) => {
      rosteredIds.add(ra.employee_id);
      const att = attendanceMap.get(ra.employee_id);
      const name = `${ra.employees?.first_name || ""} ${ra.employees?.last_name || ""}`.trim();

      if (!att || att.status === "absent") {
        variances.push({ type: "rostered_absent", employeeName: name, detail: `Scheduled for ${ra.shift_templates?.name || "shift"} but absent` });
      } else if (att.clock_out && ra.shift_templates?.end_time) {
        const clockOut = new Date(att.clock_out);
        const shiftEnd = new Date(`${date}T${ra.shift_templates.end_time}`);
        const earlyMs = shiftEnd.getTime() - clockOut.getTime();
        if (earlyMs > 30 * 60 * 1000) {
          variances.push({ type: "early_departure", employeeName: name, detail: `Left ${Math.round(earlyMs / 60000)} min early` });
        }
      }
    });

    attendanceRecords.forEach((att: any) => {
      if (!rosteredIds.has(att.employee_id) && (att.status === "present" || att.status === "late")) {
        const name = `${att.employees?.first_name || ""} ${att.employees?.last_name || ""}`.trim();
        variances.push({ type: "unrostered_present", employeeName: name, detail: "Clocked in without shift assignment" });
      }
    });
  }

  const iconMap = {
    rostered_absent: <UserMinus className="h-4 w-4 text-destructive" />,
    unrostered_present: <UserPlus className="h-4 w-4 text-yellow-600" />,
    early_departure: <Clock className="h-4 w-4 text-orange-500" />,
    wrong_shift: <Shuffle className="h-4 w-4 text-blue-500" />,
  };

  const severityMap = {
    rostered_absent: "destructive" as const,
    unrostered_present: "secondary" as const,
    early_departure: "outline" as const,
    wrong_shift: "outline" as const,
  };

  if (!variances.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No roster-vs-attendance variances detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          Roster vs Attendance Variances ({variances.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {variances.map((v, i) => (
          <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/50">
            {iconMap[v.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{v.employeeName}</p>
              <p className="text-xs text-muted-foreground">{v.detail}</p>
            </div>
            <Badge variant={severityMap[v.type]} className="text-[10px] shrink-0">
              {v.type.replace(/_/g, " ")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
