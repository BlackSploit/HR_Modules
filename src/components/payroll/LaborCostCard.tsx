import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2 } from "lucide-react";

interface Props {
  selectedRunId: string;
}

export function LaborCostCard({ selectedRunId }: Props) {
  const { data: lineItems } = useQuery({
    queryKey: ["labor-cost-items", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return [];
      const { data } = await supabase.from("payroll_line_items")
        .select("gross_pay, pf_employer, esi_employer, employees(departments(name), branches(name))")
        .eq("run_id", selectedRunId);
      return data || [];
    },
    enabled: !!selectedRunId,
  });

  if (!selectedRunId) return null;

  // Aggregate by department
  const deptCost = new Map<string, { count: number; gross: number; employerBurden: number; totalCTC: number }>();
  (lineItems || []).forEach((i: any) => {
    const dept = i.employees?.departments?.name || "Unassigned";
    const prev = deptCost.get(dept) || { count: 0, gross: 0, employerBurden: 0, totalCTC: 0 };
    const gross = Number(i.gross_pay);
    const burden = Number(i.pf_employer || 0) + Number(i.esi_employer || 0);
    prev.count++;
    prev.gross += gross;
    prev.employerBurden += burden;
    prev.totalCTC += gross + burden;
    deptCost.set(dept, prev);
  });

  const totalCTC = Array.from(deptCost.values()).reduce((s, v) => s + v.totalCTC, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Labor Cost Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Department</TableHead>
              <TableHead className="text-xs">Headcount</TableHead>
              <TableHead className="text-xs">Gross Pay</TableHead>
              <TableHead className="text-xs">Employer Burden</TableHead>
              <TableHead className="text-xs">Total CTC</TableHead>
              <TableHead className="text-xs">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(deptCost.entries()).map(([dept, v]) => (
              <TableRow key={dept}>
                <TableCell className="text-xs font-medium">{dept}</TableCell>
                <TableCell className="text-xs">{v.count}</TableCell>
                <TableCell className="text-xs">₹{Math.round(v.gross).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">₹{Math.round(v.employerBurden).toLocaleString()}</TableCell>
                <TableCell className="text-xs font-medium">₹{Math.round(v.totalCTC).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{totalCTC > 0 ? ((v.totalCTC / totalCTC) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
