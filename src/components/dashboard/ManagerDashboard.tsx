import { useNavigate } from "react-router-dom";
import { KpiCard } from "./KpiCard";
import { QuickActionsRow } from "./QuickActionsRow";
import { PriorityTaskStack } from "./PriorityTaskStack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users, CheckCircle2, CalendarDays, AlertTriangle, UserPlus,
  ClipboardList, FileText, Clock, BarChart3, Activity
} from "lucide-react";

interface ManagerDashboardProps {
  greeting: string;
  subtitle: string;
}

export function ManagerDashboard({ greeting, subtitle }: ManagerDashboardProps) {
  const navigate = useNavigate();

  const quickActions = [
    { label: "Add Employee", icon: UserPlus, onClick: () => navigate("/people/employees") },
    { label: "Approvals", icon: CheckCircle2, onClick: () => navigate("/ops/leave") },
    { label: "Roster", icon: CalendarDays, onClick: () => navigate("/ops/roster") },
    { label: "Reports", icon: BarChart3, onClick: () => navigate("/intelligence/dashboard") },
    { label: "Attendance", icon: Clock, onClick: () => navigate("/ops/attendance") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Staff" value="—" icon={Users} color="bg-primary/10 text-primary" onClick={() => navigate("/people/employees")} />
        <KpiCard title="Present Today" value="—" icon={CheckCircle2} color="bg-success/10 text-success" onClick={() => navigate("/ops/attendance")} />
        <KpiCard title="On Leave" value="—" icon={CalendarDays} color="bg-warning/10 text-warning" onClick={() => navigate("/ops/leave")} />
        <KpiCard title="Pending Actions" value="—" icon={AlertTriangle} color="bg-destructive/10 text-destructive" />
      </div>

      <QuickActionsRow actions={quickActions} />

      <div className="grid gap-4 md:grid-cols-2">
        <PriorityTaskStack tasks={[]} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="No recent activity"
              description="Activity will appear as employees are added and operations begin."
              className="py-6"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Staffing Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No staffing gaps"
              description="Unfilled roster positions and understaffed shifts will appear here."
              className="py-6"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="All clear"
              description="Expiring credentials, missing documents, and overdue training will show here."
              className="py-6"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
