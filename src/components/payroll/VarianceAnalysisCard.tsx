import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  selectedRunId: string;
}

export function VarianceAnalysisCard({ selectedRunId }: Props) {
  const { data: currentItems } = useQuery({
    queryKey: ["variance-current", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return [];
      const { data } = await supabase.from("payroll_line_items")
        .select("employee_id, net_pay, variance_pct, previous_period_net, employees(first_name, last_name)")
        .eq("run_id", selectedRunId);
      return data || [];
    },
    enabled: !!selectedRunId,
  });

  const flagged = (currentItems || []).filter(i => {
    const v = Number(i.variance_pct || 0);
    return Math.abs(v) > 15;
  });

  if (!selectedRunId) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Variance Analysis
          </CardTitle>
          <Badge variant={flagged.length > 0 ? "destructive" : "default"} className="text-[10px]">
            {flagged.length} anomalies
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {flagged.length === 0 ? (
          <p className="text-xs text-muted-foreground">No significant pay variances detected (&gt;15% swing).</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Previous Net</TableHead>
                <TableHead className="text-xs">Current Net</TableHead>
                <TableHead className="text-xs">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map(i => {
                const v = Number(i.variance_pct || 0);
                return (
                  <TableRow key={i.employee_id}>
                    <TableCell className="text-xs">{i.employees?.first_name} {i.employees?.last_name}</TableCell>
                    <TableCell className="text-xs">₹{Number(i.previous_period_net || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{Number(i.net_pay).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">
                      <span className={`flex items-center gap-1 ${v > 0 ? "text-green-600" : "text-destructive"}`}>
                        {v > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {v.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
