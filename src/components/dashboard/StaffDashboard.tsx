import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShiftSummaryCard } from "./ShiftSummaryCard";
import { PriorityTaskStack } from "./PriorityTaskStack";
import { QuickActionsRow } from "./QuickActionsRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock, FileText, ClipboardList, CalendarDays, Send } from "lucide-react";
import { format } from "date-fns";

interface StaffDashboardProps {
  greeting: string;
  subtitle: string;
}

export function StaffDashboard({ greeting, subtitle }: StaffDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: myShift } = useQuery({
    queryKey: ["my-shift-today", user?.id, todayStr],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: emp } = await supabase.from("employees").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
      if (!emp) return null;
      const { data } = await supabase
        .from("roster_assignments")
        .select("*, shift_templates(name, start_time, end_time, color)")
        .eq("employee_id", emp.id)
        .eq("date", todayStr)
        .neq("status", "cancelled")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const quickActions = [
    { label: "Attendance", icon: Clock, onClick: () => navigate("/ops/attendance") },
    { label: "Leave", icon: Send, onClick: () => navigate("/ops/leave") },
    { label: "Duty Board", icon: ClipboardList, onClick: () => navigate("/ops/duty-board") },
    { label: "My Roster", icon: CalendarDays, onClick: () => navigate("/ops/roster") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      <ShiftSummaryCard
        shiftName={myShift?.shift_templates?.name}
        timing={myShift?.shift_templates ? `${myShift.shift_templates.start_time?.slice(0, 5)} – ${myShift.shift_templates.end_time?.slice(0, 5)}` : undefined}
      />

      <QuickActionsRow actions={quickActions} />

      <PriorityTaskStack tasks={[]} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="Not configured yet"
              description="Leave balances will appear once HR sets up your entitlements."
              className="py-6"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No documents"
              description="Your uploaded documents and credentials will appear here."
              className="py-6"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
