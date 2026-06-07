import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";

const actionColors: Record<string, string> = {
  created: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-amber-100 text-amber-800",
  override: "bg-purple-100 text-purple-800",
  adjustment: "bg-orange-100 text-orange-800",
  updated: "bg-gray-100 text-gray-800",
};

export function LeaveAuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["leave-audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  if (!logs?.length) {
    return <Card><CardContent><EmptyState icon={ClipboardList} title="No audit entries" description="Leave-related actions will be logged here." /></CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{log.entity_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${actionColors[log.action] || actionColors.updated}`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {log.new_value ? JSON.stringify(log.new_value).substring(0, 100) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
