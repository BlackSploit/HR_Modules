import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Moon, Calendar, Clock } from "lucide-react";
import { format, addDays, subDays, differenceInHours, parseISO } from "date-fns";

interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface Props {
  employeeId: string;
  targetDate: Date;
  targetShiftId: string;
  shiftTemplates: ShiftTemplate[];
}

function parseTime(timeStr: string, date: Date): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function isNightShift(startTime: string, endTime: string): boolean {
  const [sh] = startTime.split(":").map(Number);
  const [eh] = endTime.split(":").map(Number);
  return sh >= 20 || eh <= 8 || eh < sh;
}

export default function FatigueWarnings({ employeeId, targetDate, targetShiftId, shiftTemplates }: Props) {
  const rangeStart = format(subDays(targetDate, 7), "yyyy-MM-dd");
  const rangeEnd = format(addDays(targetDate, 7), "yyyy-MM-dd");

  const { data: nearbyAssignments } = useQuery({
    queryKey: ["fatigue-check", employeeId, rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_assignments")
        .select("date, shift_template_id")
        .eq("employee_id", employeeId)
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .neq("status", "cancelled");
      return data || [];
    },
    enabled: !!employeeId,
  });

  if (!nearbyAssignments || !employeeId || !targetShiftId) return null;

  const targetShift = shiftTemplates.find((s) => s.id === targetShiftId);
  if (!targetShift) return null;

  const warnings: { icon: React.ReactNode; message: string }[] = [];

  // 1. Quick turnaround check (<11h rest)
  const targetDateStr = format(targetDate, "yyyy-MM-dd");
  const prevDayAssignments = nearbyAssignments.filter((a) => a.date === format(subDays(targetDate, 1), "yyyy-MM-dd"));
  const nextDayAssignments = nearbyAssignments.filter((a) => a.date === format(addDays(targetDate, 1), "yyyy-MM-dd"));

  for (const prev of prevDayAssignments) {
    const prevShift = shiftTemplates.find((s) => s.id === prev.shift_template_id);
    if (!prevShift) continue;
    const prevEnd = parseTime(prevShift.end_time, subDays(targetDate, 1));
    if (prevEnd.getHours() < parseInt(prevShift.start_time)) {
      prevEnd.setDate(prevEnd.getDate() + 1);
    }
    const targetStart = parseTime(targetShift.start_time, targetDate);
    const gap = differenceInHours(targetStart, prevEnd);
    if (gap < 11 && gap >= 0) {
      warnings.push({
        icon: <Clock className="h-3.5 w-3.5" />,
        message: `Only ${gap}h rest gap from previous shift (EU WTD requires ≥11h)`,
      });
    }
  }

  for (const next of nextDayAssignments) {
    const nextShift = shiftTemplates.find((s) => s.id === next.shift_template_id);
    if (!nextShift) continue;
    const targetEnd = parseTime(targetShift.end_time, targetDate);
    if (targetEnd.getHours() < parseInt(targetShift.start_time)) {
      targetEnd.setDate(targetEnd.getDate() + 1);
    }
    const nextStart = parseTime(nextShift.start_time, addDays(targetDate, 1));
    const gap = differenceInHours(nextStart, targetEnd);
    if (gap < 11 && gap >= 0) {
      warnings.push({
        icon: <Clock className="h-3.5 w-3.5" />,
        message: `Only ${gap}h rest before next day's shift (EU WTD requires ≥11h)`,
      });
    }
  }

  // 2. Consecutive days check (>6)
  const allDates = [...nearbyAssignments.map((a) => a.date), targetDateStr].sort();
  const uniqueDates = [...new Set(allDates)];
  let maxConsecutive = 1;
  let currentRun = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
    const curr = new Date(uniqueDates[i] + "T00:00:00");
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (86400000));
    if (diffDays === 1) {
      currentRun++;
      maxConsecutive = Math.max(maxConsecutive, currentRun);
    } else {
      currentRun = 1;
    }
  }
  if (maxConsecutive > 6) {
    warnings.push({
      icon: <Calendar className="h-3.5 w-3.5" />,
      message: `${maxConsecutive} consecutive days rostered (recommend max 6)`,
    });
  }

  // 3. Consecutive night shifts (>3)
  const assignmentsWithTarget = [...nearbyAssignments, { date: targetDateStr, shift_template_id: targetShiftId }]
    .sort((a, b) => a.date.localeCompare(b.date));
  let nightRun = 0;
  let maxNightRun = 0;
  for (const a of assignmentsWithTarget) {
    const shift = shiftTemplates.find((s) => s.id === a.shift_template_id);
    if (shift && isNightShift(shift.start_time, shift.end_time)) {
      nightRun++;
      maxNightRun = Math.max(maxNightRun, nightRun);
    } else {
      nightRun = 0;
    }
  }
  if (maxNightRun > 3) {
    warnings.push({
      icon: <Moon className="h-3.5 w-3.5" />,
      message: `${maxNightRun} consecutive night shifts (recommend max 3)`,
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <Alert key={i} className="py-2 px-3 bg-warning/10 border-warning/30">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <AlertDescription className="text-xs text-warning flex items-center gap-1.5 ml-2">
            {w.icon} {w.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
