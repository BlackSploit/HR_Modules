import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";

interface ShiftSummaryCardProps {
  shiftName?: string;
  timing?: string;
  location?: string;
  className?: string;
}

export function ShiftSummaryCard({ shiftName = "No shift assigned", timing, location, className }: ShiftSummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Shift</p>
            <p className="text-lg font-bold">{shiftName}</p>
            {timing && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{timing}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{location}</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
