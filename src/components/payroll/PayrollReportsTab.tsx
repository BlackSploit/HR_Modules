import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Download, FileText } from "lucide-react";
import { VarianceAnalysisCard } from "./VarianceAnalysisCard";
import { LaborCostCard } from "./LaborCostCard";

export function PayrollReportsTab() {
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const { data: runs } = useQuery({
    queryKey: ["report-runs"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_runs").select("id, run_date, status, run_type, payroll_periods(start_date, end_date)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: lineItems } = useQuery({
    queryKey: ["report-items", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return [];
      const { data } = await supabase.from("payroll_line_items").select("*, employees(first_name, last_name, employee_code, departments(name))").eq("run_id", selectedRunId);
      return data || [];
    },
    enabled: !!selectedRunId,
  });

  const deptMap = new Map<string, { count: number; gross: number; deductions: number; net: number }>();
  (lineItems || []).forEach(i => {
    const dept = i.employees?.departments?.name || "Unassigned";
    const prev = deptMap.get(dept) || { count: 0, gross: 0, deductions: 0, net: 0 };
    prev.count++;
    prev.gross += Number(i.gross_pay);
    prev.deductions += Number(i.total_deductions);
    prev.net += Number(i.net_pay);
    deptMap.set(dept, prev);
  });

  const statutory = (lineItems || []).reduce((acc, i) => ({
    pf_employee: acc.pf_employee + Number(i.pf_employee),
    pf_employer: acc.pf_employer + Number(i.pf_employer),
    esi_employee: acc.esi_employee + Number(i.esi_employee),
    esi_employer: acc.esi_employer + Number(i.esi_employer),
    pt: acc.pt + Number(i.professional_tax),
    tds: acc.tds + Number(i.tds),
  }), { pf_employee: 0, pf_employer: 0, esi_employee: 0, esi_employer: 0, pt: 0, tds: 0 });

  function exportCSV(type: "bank" | "statutory" | "department") {
    if (!lineItems?.length) return;
    let csv = "";
    if (type === "bank") {
      csv = "Employee,Code,Net Pay\n" + (lineItems || []).map(i =>
        `"${i.employees?.first_name} ${i.employees?.last_name}","${i.employees?.employee_code || ""}",${i.net_pay}`
      ).join("\n");
    } else if (type === "statutory") {
      csv = "Employee,PF(E),PF(Er),ESI(E),ESI(Er),PT,TDS\n" + (lineItems || []).map(i =>
        `"${i.employees?.first_name} ${i.employees?.last_name}",${i.pf_employee},${i.pf_employer},${i.esi_employee},${i.esi_employer},${i.professional_tax},${i.tds}`
      ).join("\n");
    } else {
      csv = "Department,Employees,Gross,Deductions,Net\n" + Array.from(deptMap.entries()).map(([d, v]) =>
        `"${d}",${v.count},${v.gross},${v.deductions},${v.net}`
      ).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Select value={selectedRunId} onValueChange={setSelectedRunId}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Select payroll run" /></SelectTrigger>
        <SelectContent>
          {(runs || []).map(r => (
            <SelectItem key={r.id} value={r.id}>
              {(r as any).payroll_periods?.start_date} — {r.status} {(r as any).run_type !== "regular" ? `(${(r as any).run_type})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedRunId ? (
        <EmptyState icon={FileText} title="Select a payroll run" description="Choose a run to view reports" />
      ) : (
        <>
          <VarianceAnalysisCard selectedRunId={selectedRunId} />
          <LaborCostCard selectedRunId={selectedRunId} />

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Department Summary</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => exportCSV("department")}><Download className="h-3 w-3" /> Export</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Employees</TableHead>
                    <TableHead className="text-xs">Total Gross</TableHead>
                    <TableHead className="text-xs">Total Deductions</TableHead>
                    <TableHead className="text-xs">Total Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(deptMap.entries()).map(([dept, v]) => (
                    <TableRow key={dept}>
                      <TableCell className="text-xs font-medium">{dept}</TableCell>
                      <TableCell className="text-xs">{v.count}</TableCell>
                      <TableCell className="text-xs">₹{v.gross.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-destructive">₹{v.deductions.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-primary">₹{v.net.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Statutory Summary</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => exportCSV("statutory")}><Download className="h-3 w-3" /> Export</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">PF (Employee):</span> <strong>₹{statutory.pf_employee.toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">PF (Employer):</span> <strong>₹{statutory.pf_employer.toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">ESI (Employee):</span> <strong>₹{statutory.esi_employee.toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">ESI (Employer):</span> <strong>₹{statutory.esi_employer.toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">Professional Tax:</span> <strong>₹{statutory.pt.toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">TDS:</span> <strong>₹{statutory.tds.toLocaleString()}</strong></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => exportCSV("bank")}><Download className="h-3 w-3" /> Bank Transfer Sheet</Button>
          </div>
        </>
      )}
    </div>
  );
}
