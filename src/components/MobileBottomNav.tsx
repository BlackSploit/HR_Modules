import { NavLink, useLocation } from "react-router-dom";
import { Home, ClipboardList, Users, MessageSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Tasks", icon: ClipboardList, to: "/ops/duty-board" },
  { label: "People", icon: Users, to: "/people/employees" },
  { label: "Messages", icon: MessageSquare, to: "/comms/announcements" },
  { label: "More", icon: MoreHorizontal, to: "/settings" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg tap-target transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
