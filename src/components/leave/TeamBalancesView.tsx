import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import { useState } from "react";

export function TeamBalancesView() {
  const [search, setSearch] = useState("");
  const year = new Date().getFullYear();

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: balances, isLoading } = useQuery({
    queryKey: ["all-leave-balances", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances")
        .select("*, employees(first_name, last_name, departments(name)), leave_types(name, code)")
        .eq("year", year);
      return data || [];
    },
  });

  // Group balances by employee
  const employeeMap = new Map<string, { name: string; dept: string; balances: Record<string, { used: number; total: number }> }>();

  balances?.forEach((b: any) => {
    const empId = b.employee_id;
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        name: `${b.employees?.first_name || ""} ${b.employees?.last_name || ""}`.trim(),
        dept: b.employees?.departments?.name || "-",
        balances: {},
      });
    }
    const emp = employeeMap.get(empId)!;
    emp.balances[b.leave_type_id] = { used: Number(b.used_days), total: b.total_days };
  });

  const employees = Array.from(employeeMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.dept.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  if (!employees.length) {
    return <Card><CardContent><EmptyState icon={Users} title="No balances found" description="No leave balances configured for this year." /></CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      <Input placeholder="Search employee or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                {leaveTypes?.map((lt) => (
                  <TableHead key={lt.id} className="text-center">{lt.code}</TableHead>
                ))}
                <TableHead className="text-center">Forecast</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                // Calculate overall depletion risk
                const hasExhausted = leaveTypes?.some((lt) => {
                  const bal = emp.balances[lt.id];
                  return bal && (bal.total - bal.used) <= 0;
                });
                const hasLow = leaveTypes?.some((lt) => {
                  const bal = emp.balances[lt.id];
                  return bal && (bal.total - bal.used) > 0 && (bal.total - bal.used) <= 2;
                });

                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.dept}</TableCell>
                    {leaveTypes?.map((lt) => {
                      const bal = emp.balances[lt.id];
                      if (!bal) return <TableCell key={lt.id} className="text-center text-muted-foreground">-</TableCell>;
                      const rem = bal.total - bal.used;
                      return (
                        <TableCell key={lt.id} className={`text-center font-medium ${rem <= 0 ? "text-destructive" : rem <= 2 ? "text-amber-600" : ""}`}>
                          {rem}/{bal.total}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {hasExhausted ? (
                        <Badge variant="destructive" className="text-[10px]">Exhausted</Badge>
                      ) : hasLow ? (
                        <Badge variant="secondary" className="text-[10px]">Low</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
