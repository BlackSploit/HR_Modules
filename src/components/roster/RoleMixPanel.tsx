import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface Assignment {
  employee_id: string;
  shift_template_id: string;
  employees: { department_id: string | null } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Props {
  assignments: Assignment[];
  departments: Department[];
}

export default function RoleMixPanel({ assignments, departments }: Props) {
  const coverage = useMemo(() => {
    const counts: Record<string, number> = {};
    departments.forEach((d) => (counts[d.id] = 0));
    assignments.forEach((a) => {
      const deptId = a.employees?.department_id;
      if (deptId && counts[deptId] !== undefined) {
        counts[deptId]++;
      }
    });
    return departments
      .map((d) => ({ name: d.name, count: counts[d.id] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [assignments, departments]);

  if (departments.length === 0) return null;

  const hasGap = coverage.some((c) => c.count === 0);

  return (
    <Card className={hasGap ? "border-destructive/30 bg-destructive/5" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Coverage by Department</CardTitle>
          {hasGap && (
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/10 ml-auto">
              Gap Detected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3">
        <div className="flex flex-wrap gap-2">
          {coverage.map((c) => (
            <div
              key={c.name}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                c.count === 0
                  ? "bg-destructive/10 border border-destructive/20 text-destructive"
                  : "bg-muted/60"
              }`}
            >
              <span className="font-semibold text-lg">{c.count}</span>
              <span className={c.count === 0 ? "font-medium" : "text-muted-foreground"}>{c.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
