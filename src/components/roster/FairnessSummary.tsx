import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, BarChart3 } from "lucide-react";
import { isSameDay } from "date-fns";

interface Assignment {
  employee_id: string;
  shift_template_id: string;
  date: string;
  shift_templates: { name: string; start_time: string; end_time: string } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  employees: Employee[];
  assignments: Assignment[];
  weekDays: Date[];
}

function isNightShift(startTime: string): boolean {
  const h = parseInt(startTime.split(":")[0]);
  return h >= 20 || h < 6;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export default function FairnessSummary({ employees, assignments, weekDays }: Props) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const empStats = employees.map((emp) => {
      const empAssignments = assignments.filter((a) => a.employee_id === emp.id);
      const total = empAssignments.length;
      const nights = empAssignments.filter((a) => a.shift_templates && isNightShift(a.shift_templates.start_time)).length;
      const weekends = empAssignments.filter((a) => isWeekend(a.date)).length;
      return { emp, total, nights, weekends };
    });

    const avgTotal = empStats.reduce((sum, s) => sum + s.total, 0) / (empStats.length || 1);
    const avgNights = empStats.reduce((sum, s) => sum + s.nights, 0) / (empStats.length || 1);

    return empStats
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((s) => ({
        ...s,
        isHighBurden: s.total > avgTotal * 1.5,
        isHighNights: s.nights > avgNights * 1.5 && s.nights > 1,
      }));
  }, [employees, assignments]);

  if (stats.length === 0) return null;

  const maxTotal = Math.max(...stats.map((s) => s.total), 1);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Fairness Summary</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{stats.length} staff</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_60px_50px_50px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase px-1">
                <span>Employee</span>
                <span className="text-center">Total</span>
                <span className="text-center">Night</span>
                <span className="text-center">W/E</span>
              </div>
              {stats.map((s) => (
                <div
                  key={s.emp.id}
                  className={`grid grid-cols-[1fr_60px_50px_50px] gap-2 items-center px-1 py-1 rounded ${
                    s.isHighBurden ? "bg-warning/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-primary/20 flex-1 max-w-[100px]">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${(s.total / maxTotal) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs truncate">{s.emp.first_name} {s.emp.last_name[0]}.</span>
                  </div>
                  <span className={`text-xs text-center font-semibold ${s.isHighBurden ? "text-warning" : ""}`}>
                    {s.total}
                  </span>
                  <span className={`text-xs text-center ${s.isHighNights ? "text-warning font-semibold" : "text-muted-foreground"}`}>
                    {s.nights}
                  </span>
                  <span className="text-xs text-center text-muted-foreground">{s.weekends}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
