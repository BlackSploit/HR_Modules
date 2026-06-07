import { useAuth } from "@/contexts/AuthContext";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { DeptHeadDashboard } from "@/components/dashboard/DeptHeadDashboard";

export default function Dashboard() {
  const { roles, profile } = useAuth();
  const primaryRole = roles[0] || "staff";
  const name = profile?.full_name || "User";
  const greeting = `Welcome back, ${name}`;

  if (primaryRole === "staff") {
    return <StaffDashboard greeting={greeting} subtitle="Here's your day at a glance" />;
  }

  if (primaryRole === "department_head") {
    return <DeptHeadDashboard greeting={greeting} subtitle="Department Head Overview" />;
  }

  // super_admin or hr_manager
  return <ManagerDashboard greeting={greeting} subtitle={`${primaryRole.replace("_", " ")} Control Center`} />;
}
