import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { ChevronRight, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface TaskItem {
  id: string;
  title: string;
  context: string;
  dueTime?: string;
  status: "due-now" | "overdue" | "pending" | "verified" | "blocked" | "escalated";
}

interface PriorityTaskStackProps {
  tasks: TaskItem[];
  maxVisible?: number;
  onTaskClick?: (taskId: string) => void;
  onViewAll?: () => void;
  className?: string;
}

export function PriorityTaskStack({ tasks, maxVisible = 3, onTaskClick, onViewAll, className }: PriorityTaskStackProps) {
  const visible = tasks.slice(0, maxVisible);
  const remaining = tasks.length - maxVisible;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Priority Tasks</CardTitle>
          {tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs text-muted-foreground">
              View all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {visible.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="All caught up"
            description="No priority tasks right now. Enjoy the calm."
            className="py-6"
          />
        ) : (
          <>
            {visible.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-left tap-target"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.context}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.dueTime && <span className="text-xs text-muted-foreground">{task.dueTime}</span>}
                  <StatusChip status={task.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
            {remaining > 0 && (
              <button
                onClick={onViewAll}
                className="w-full text-center text-sm text-primary font-medium py-2 hover:underline"
              >
                +{remaining} more tasks
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
