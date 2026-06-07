import {
  Users, Calendar, Clock, ClipboardList, GraduationCap,
  BarChart3, Settings, LogOut, Heart, Megaphone, FileText,
  Home, BriefcaseIcon, Shield, AlertTriangle, Target, ShieldCheck, FileCheck, UserPlus, DollarSign
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navSections = [
  {
    label: "Overview",
    roles: ["super_admin", "hr_manager", "department_head", "staff", "center_head", "clinical_lead", "program_director", "ward_incharge", "duty_medical_officer", "psychologist", "psw", "admission_counsellor", "nursing_head", "rehab_coordinator"] as const,
    items: [
      { title: "Dashboard", url: "/", icon: Home },
    ],
  },
  {
    label: "People",
    roles: ["super_admin", "hr_manager", "department_head", "center_head", "clinical_lead"] as const,
    items: [
      { title: "Employees", url: "/people/employees", icon: Users },
      { title: "Recruitment", url: "/people/recruitment", icon: BriefcaseIcon },
      { title: "Onboarding", url: "/people/onboarding", icon: UserPlus },
      { title: "Screening Templates", url: "/people/recruitment/screening-templates", icon: ShieldCheck },
    ],
  },
  {
    label: "Operations",
    roles: ["super_admin", "hr_manager", "department_head", "staff", "center_head", "clinical_lead", "ward_incharge", "duty_medical_officer", "nursing_head", "psw"] as const,
    items: [
      { title: "Roster", url: "/ops/roster", icon: Calendar },
      { title: "Attendance", url: "/ops/attendance", icon: Clock },
      { title: "Leave", url: "/ops/leave", icon: FileText },
      { title: "Duty Board", url: "/ops/duty-board", icon: ClipboardList },
      { title: "Payroll", url: "/ops/payroll", icon: DollarSign },
    ],
  },
  {
    label: "Alerts",
    roles: ["super_admin", "hr_manager", "center_head", "clinical_lead", "department_head", "ward_incharge", "duty_medical_officer", "nursing_head"] as const,
    items: [
      { title: "Alert Dashboard", url: "/alerts", icon: AlertTriangle },
    ],
  },
  {
    label: "Clinical",
    roles: ["super_admin", "hr_manager", "center_head", "clinical_lead", "duty_medical_officer", "psychologist", "nursing_head", "ward_incharge"] as const,
    items: [
      { title: "Documents", url: "/clinical/documents", icon: FileCheck },
    ],
  },
  {
    label: "Growth",
    roles: ["super_admin", "hr_manager", "department_head", "center_head", "clinical_lead", "program_director"] as const,
    items: [
      { title: "Training", url: "/growth/training", icon: GraduationCap },
      { title: "Reviews", url: "/growth/reviews", icon: ClipboardList },
      { title: "Incidents", url: "/growth/incidents", icon: Shield },
    ],
  },
  {
    label: "Intelligence",
    roles: ["super_admin", "hr_manager", "center_head", "clinical_lead"] as const,
    items: [
      { title: "KPI Dashboard", url: "/intelligence/kpis", icon: Target },
      { title: "Audit & Compliance", url: "/intelligence/audit", icon: ShieldCheck },
    ],
  },
  {
    label: "Communication",
    roles: ["super_admin", "hr_manager", "department_head", "staff", "center_head", "clinical_lead", "ward_incharge", "psw", "nursing_head"] as const,
    items: [
      { title: "Announcements", url: "/comms/announcements", icon: Megaphone },
    ],
  },
  {
    label: "System",
    roles: ["super_admin"] as const,
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { roles, profile, signOut } = useAuth();

  const canSee = (sectionRoles: readonly string[]) =>
    roles.some((r) => sectionRoles.includes(r)) || roles.length === 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Heart className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground truncate">{APP_NAME}</p>
              <p className="text-[10px] text-sidebar-foreground/50">{APP_TAGLINE}</p>
            </div>
          )}
        </div>

        {/* Nav sections */}
        {navSections.filter((s) => canSee(s.roles)).map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
              {!collapsed && section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">{roles[0]?.replace("_", " ") || "Staff"}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
