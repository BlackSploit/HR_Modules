import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Calendar, UserCheck } from "lucide-react";

interface Props {
  employeeId: string;
  targetDate: Date;
  assignments: { employee_id: string; date: string }[];
}

export default function EligibilityBadges({ employeeId, targetDate, assignments }: Props) {
  const dateStr = format(targetDate, "yyyy-MM-dd");

  // Check if already assigned that day
  const alreadyAssigned = assignments.some(
    (a) => a.employee_id === employeeId && a.date === dateStr
  );

  // Check approved leave
  const { data: leaveConflict } = useQuery({
    queryKey: ["leave-check", employeeId, dateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)
        .limit(1);
      return data && data.length > 0;
    },
    enabled: !!employeeId,
  });

  // Check onboarding status
  const { data: underOnboarding } = useQuery({
    queryKey: ["onboarding-check", employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_plans")
        .select("status")
        .eq("employee_id", employeeId)
        .neq("status", "completed")
        .limit(1);
      return data && data.length > 0;
    },
    enabled: !!employeeId,
  });

  if (!employeeId) return null;

  const badges: { label: string; variant: "destructive" | "warning" | "info"; icon: React.ReactNode }[] = [];

  if (leaveConflict) {
    badges.push({ label: "On Leave", variant: "destructive", icon: <Calendar className="h-3 w-3" /> });
  }
  if (alreadyAssigned) {
    badges.push({ label: "Already Assigned", variant: "warning", icon: <AlertTriangle className="h-3 w-3" /> });
  }
  if (underOnboarding) {
    badges.push({ label: "Under Onboarding", variant: "info", icon: <UserCheck className="h-3 w-3" /> });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <Badge
          key={i}
          variant="outline"
          className={`text-[10px] gap-1 ${
            b.variant === "destructive"
              ? "border-destructive/30 text-destructive bg-destructive/5"
              : b.variant === "warning"
              ? "border-warning/30 text-warning bg-warning/5"
              : "border-info/30 text-info bg-info/5"
          }`}
        >
          {b.icon} {b.label}
        </Badge>
      ))}
    </div>
  );
}
