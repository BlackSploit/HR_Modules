import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface QuickActionsRowProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionsRow({ actions, className }: QuickActionsRowProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-none", className)}>
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="tap-target flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/20 transition-all shrink-0 min-w-[80px]"
        >
          <action.icon className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-foreground whitespace-nowrap">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
