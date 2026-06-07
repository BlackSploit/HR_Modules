import { cn } from "@/lib/utils";

type StatusType = "due-now" | "overdue" | "verified" | "blocked" | "escalated" | "pending" | "active" | "success" | "warning" | "info";

const statusStyles: Record<StatusType, string> = {
  "due-now": "bg-warning/15 text-warning border-warning/25",
  overdue: "bg-destructive/15 text-destructive border-destructive/25",
  verified: "bg-success/15 text-success border-success/25",
  blocked: "bg-destructive/15 text-destructive border-destructive/25",
  escalated: "bg-escalated/15 text-escalated border-escalated/25",
  pending: "bg-info/15 text-info border-info/25",
  active: "bg-success/15 text-success border-success/25",
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  info: "bg-info/15 text-info border-info/25",
};

interface StatusChipProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        statusStyles[status] || statusStyles.pending,
        className
      )}
    >
      {label || status.replace("-", " ")}
    </span>
  );
}
