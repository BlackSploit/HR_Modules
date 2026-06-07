import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { eachDayOfInterval, format } from "date-fns";

interface CoverageWarningBannerProps {
  employeeId: string;
  departmentId?: string;
  startDate: string;
  endDate: string;
}

export function CoverageWarningBanner({ employeeId, departmentId, startDate, endDate }: CoverageWarningBannerProps) {
  // Get coverage rules for the department
  const { data: coverageRules } = useQuery({
    queryKey: ["leave-coverage-rules", departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      const { data } = await supabase
        .from("leave_coverage_rules")
        .select("*")
        .eq("is_active", true)
        .or(`department_id.eq.${departmentId},department_id.is.null`);
      return data || [];
    },
    enabled: !!departmentId && !!startDate && !!endDate,
  });

  // Get overlapping approved leaves for the same department
  const { data: overlappingLeaves } = useQuery({
    queryKey: ["overlapping-leaves", departmentId, startDate, endDate],
    queryFn: async () => {
      if (!departmentId || !startDate || !endDate) return [];
      const { data } = await supabase
        .from("leave_requests")
        .select("*, employees!inner(department_id)")
        .eq("employees.department_id", departmentId)
        .eq("status", "approved")
        .neq("employee_id", employeeId)
        .lte("start_date", endDate)
        .gte("end_date", startDate);
      return data || [];
    },
    enabled: !!departmentId && !!startDate && !!endDate,
  });

  // Get total employees in department
  const { data: deptEmployees } = useQuery({
    queryKey: ["dept-employee-count", departmentId],
    queryFn: async () => {
      if (!departmentId) return 0;
      const { count } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("department_id", departmentId)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!departmentId,
  });

  if (!coverageRules?.length || !startDate || !endDate) return null;

  const minStaff = coverageRules.reduce((min, r: any) => Math.max(min, r.min_staff_count), 1);
  const maxOverlapping = overlappingLeaves?.length || 0;
  const remainingAfter = (deptEmployees || 0) - maxOverlapping - 1; // -1 for current requestor

  if (remainingAfter >= minStaff) return null;

  return (
    <Alert variant="destructive" className="text-sm">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <strong>Coverage Warning:</strong> Approving this leave will reduce department staffing to{" "}
        <strong>{remainingAfter}</strong> (minimum required: <strong>{minStaff}</strong>).
        {maxOverlapping > 0 && ` ${maxOverlapping} other employee(s) already on leave during this period.`}
      </AlertDescription>
    </Alert>
  );
}
