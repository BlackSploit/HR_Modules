import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
  color?: string;
  onClick?: () => void;
  className?: string;
}

export function KpiCard({ title, value, icon: Icon, trend, color = "bg-primary/10 text-primary", onClick, className }: KpiCardProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn("transition-all hover:shadow-md", onClick && "cursor-pointer hover:-translate-y-0.5", className)}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground leading-tight">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className={cn("text-xs flex items-center gap-1", trend.direction === "up" ? "text-success" : "text-destructive")}>
                <TrendIcon className="h-3 w-3" />
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
