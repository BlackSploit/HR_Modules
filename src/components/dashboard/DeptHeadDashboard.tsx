import { useNavigate } from "react-router-dom";
import { KpiCard } from "./KpiCard";
import { QuickActionsRow } from "./QuickActionsRow";
import { PriorityTaskStack } from "./PriorityTaskStack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, CheckCircle2, ClipboardList, CalendarDays, Activity } from "lucide-react";

interface DeptHeadDashboardProps {
  greeting: string;
  subtitle: string;
}

export function DeptHeadDashboard({ greeting, subtitle }: DeptHeadDashboardProps) {
  const navigate = useNavigate();

  const quickActions = [
    { label: "My Team", icon: Users, onClick: () => navigate("/people/employees") },
    { label: "Approvals", icon: CheckCircle2, onClick: () => navigate("/ops/leave") },
    { label: "Roster", icon: CalendarDays, onClick: () => navigate("/ops/roster") },
    { label: "Duty Board", icon: ClipboardList, onClick: () => navigate("/ops/duty-board") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Team Members" value="—" icon={Users} color="bg-primary/10 text-primary" onClick={() => navigate("/people/employees")} />
        <KpiCard title="Present Today" value="—" icon={CheckCircle2} color="bg-success/10 text-success" />
        <KpiCard title="Pending Verifications" value="—" icon={ClipboardList} color="bg-warning/10 text-warning" />
        <KpiCard title="On Leave" value="—" icon={CalendarDays} color="bg-info/10 text-info" />
      </div>

      <QuickActionsRow actions={quickActions} />

      <div className="grid gap-4 md:grid-cols-2">
        <PriorityTaskStack tasks={[]} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="No team activity yet"
              description="Team actions will appear once employees are assigned to your department."
              className="py-6"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
