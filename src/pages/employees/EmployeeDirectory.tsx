import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Users, Phone, Mail, Upload, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { BulkUploadDialog } from "@/components/employees/BulkUploadDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statusMap: Record<string, "active" | "warning" | "overdue" | "pending"> = {
  active: "active",
  probation: "warning",
  suspended: "overdue",
  terminated: "overdue",
  resigned: "pending",
  notice_period: "warning",
};

export default function EmployeeDirectory() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(name), designations(title), branches(name)")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = employees?.filter((e) =>
    `${e.first_name} ${e.last_name} ${e.employee_code} ${e.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Directory</h1>
          <p className="text-sm text-muted-foreground">{employees?.length || 0} employees</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowBulk(true)} className="gap-2">
                <Upload className="h-4 w-4" /> Bulk Upload (Excel/CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, code, or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered?.length ? (
        isMobile ? (
          <div className="space-y-2">
            {filtered.map((emp) => (
              <Card
                key={emp.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/people/employees/${emp.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{emp.first_name} {emp.last_name}</p>
                        <StatusChip status={statusMap[emp.status] || "pending"} label={emp.status.replace("_", " ")} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.designations?.title || "—"} • {emp.departments?.name || "—"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {emp.phone && (
                          <a href={`tel:${emp.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-primary flex items-center gap-1">
                            <Phone className="h-3 w-3" />{emp.phone}
                          </a>
                        )}
                        {emp.email && (
                          <a href={`mailto:${emp.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-primary flex items-center gap-1">
                            <Mail className="h-3 w-3" />Email
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/people/employees/${emp.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{emp.employee_code || "—"}</TableCell>
                      <TableCell>{emp.departments?.name || "—"}</TableCell>
                      <TableCell>{emp.designations?.title || "—"}</TableCell>
                      <TableCell>
                        <StatusChip status={statusMap[emp.status] || "pending"} label={emp.status.replace("_", " ")} />
                      </TableCell>
                      <TableCell>{emp.branches?.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title={search ? "No matching employees" : "No employees yet"}
              description={search ? "Try a different search term or clear your filter." : "Add your first employee to get started with the directory."}
              actionLabel={!search ? "Add Employee" : undefined}
              onAction={!search ? () => setShowAdd(true) : undefined}
            />
          </CardContent>
        </Card>
      )}

      <AddEmployeeDialog open={showAdd} onOpenChange={setShowAdd} onSuccess={refetch} />
      <BulkUploadDialog open={showBulk} onOpenChange={setShowBulk} onSuccess={refetch} />
    </div>
  );
}
