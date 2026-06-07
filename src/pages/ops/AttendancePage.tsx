import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MarkAttendanceDialog } from "@/components/attendance/MarkAttendanceDialog";
import { EditAttendanceDialog } from "@/components/attendance/EditAttendanceDialog";
import { VarianceBoard } from "@/components/attendance/VarianceBoard";
import { ExceptionInbox } from "@/components/attendance/ExceptionInbox";
import { MyAttendanceView } from "@/components/attendance/MyAttendanceView";
import { AttendanceAnalytics } from "@/components/attendance/AttendanceAnalytics";
import { PayrollReadinessView } from "@/components/attendance/PayrollReadinessView";
import { RegularizationReviewList } from "@/components/attendance/RegularizationReviewDialog";
import { Clock, LogIn, LogOut, ChevronLeft, ChevronRight, Users, Search, Download, UserX, ChevronDown, Pencil, Plus, MapPin } from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { useGeolocation } from "@/hooks/use-geolocation";

const statusStyleMap: Record<string, "active" | "warning" | "overdue" | "pending"> = {
  present: "active",
  late: "warning",
  absent: "overdue",
  half_day: "warning",
  on_leave: "pending",
  holiday: "pending",
};

export default function AttendancePage() {
  const { user, isAdminOrHR } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { getLocation } = useGeolocation();

  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [missingOpen, setMissingOpen] = useState(false);
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: allEmployees } = useQuery({
    queryKey: ["active-employees-attendance", departmentFilter],
    queryFn: async () => {
      let q = supabase.from("employees").select("id, first_name, last_name, department_id, departments(name)").eq("status", "active");
      if (departmentFilter !== "all") q = q.eq("department_id", departmentFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance", selectedDate, departmentFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*, employees(id, first_name, last_name, department_id, departments(name))")
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });
      return data || [];
      if (departmentFilter !== "all") {
        return data?.filter((r: any) => r.employees?.department_id === departmentFilter) || [];
      }
      return data || [];
    },
  });

  const { data: myTodayRecord } = useQuery({
    queryKey: ["my-attendance-today", myEmployee?.id],
    queryFn: async () => {
      if (!myEmployee?.id) return null;
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", myEmployee.id)
        .eq("date", format(new Date(), "yyyy-MM-dd"))
        .single();
      return data;
    },
    enabled: !!myEmployee?.id,
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      if (!myEmployee?.id) throw new Error("Employee record not found");
      const today = format(new Date(), "yyyy-MM-dd");
      const now = new Date();
      const loc = await getLocation();
      const geoFields = { geo_lat: loc?.lat ?? null, geo_lng: loc?.lng ?? null };

      let status = "present";
      const { data: roster } = await supabase
        .from("roster_assignments")
        .select("shift_template_id, shift_templates(start_time)")
        .eq("employee_id", myEmployee.id)
        .eq("date", today)
        .eq("status", "scheduled")
        .maybeSingle();

      if (roster?.shift_templates?.start_time) {
        const shiftStart = new Date(`${today}T${roster.shift_templates.start_time}`);
        const graceMs = 15 * 60 * 1000;
        if (now.getTime() > shiftStart.getTime() + graceMs) {
          status = "late";
        }
      }

      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("employee_id", myEmployee.id)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("attendance_records")
          .update({ clock_in: now.toISOString(), status, marked_by: user?.id, ...geoFields })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance_records").insert({
          employee_id: myEmployee.id, date: today, clock_in: now.toISOString(), status, marked_by: user?.id, ...geoFields,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Clocked in successfully" });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-today"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      if (!myTodayRecord?.id) throw new Error("No clock-in found");
      const clockInTime = new Date(myTodayRecord.clock_in!);
      const now = new Date();
      const hoursWorked = Math.round(((now.getTime() - clockInTime.getTime()) / 3600000) * 100) / 100;
      const loc = await getLocation();
      const geoFields = { geo_lat: loc?.lat ?? null, geo_lng: loc?.lng ?? null };

      let overtimeHours = 0;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: roster } = await supabase
        .from("roster_assignments")
        .select("shift_template_id, shift_templates(start_time, end_time)")
        .eq("employee_id", myTodayRecord.employee_id)
        .eq("date", today)
        .eq("status", "scheduled")
        .maybeSingle();

      if (roster?.shift_templates?.start_time && roster?.shift_templates?.end_time) {
        const shiftStart = new Date(`${today}T${roster.shift_templates.start_time}`);
        const shiftEnd = new Date(`${today}T${roster.shift_templates.end_time}`);
        let shiftDuration = (shiftEnd.getTime() - shiftStart.getTime()) / 3600000;
        if (shiftDuration < 0) shiftDuration += 24;
        if (hoursWorked > shiftDuration) {
          overtimeHours = Math.round((hoursWorked - shiftDuration) * 100) / 100;
        }
      }

      const { error } = await supabase
        .from("attendance_records")
        .update({ clock_out: now.toISOString(), worked_hours: hoursWorked, overtime_hours: overtimeHours, ...geoFields })
        .eq("id", myTodayRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Clocked out successfully" });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-today"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recordedIds = useMemo(() => new Set(records?.map((r: any) => r.employee_id) || []), [records]);
  const unaccounted = useMemo(() => allEmployees?.filter((e) => !recordedIds.has(e.id)) || [], [allEmployees, recordedIds]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r: any) => {
      const name = `${r.employees?.first_name || ""} ${r.employees?.last_name || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [records, searchQuery]);

  const totalHeadcount = allEmployees?.length || 0;
  const stats = {
    present: records?.filter((r: any) => r.status === "present" || r.status === "late").length || 0,
    absent: records?.filter((r: any) => r.status === "absent").length || 0,
    late: records?.filter((r: any) => r.status === "late").length || 0,
    onLeave: records?.filter((r: any) => r.status === "on_leave").length || 0,
    unaccounted: unaccounted.length,
  };

  function exportCSV() {
    if (!filteredRecords.length) return;
    const header = ["Employee", "Department", "Status", "Clock In", "Clock Out", "Hours", "Overtime", "Notes"];
    const rows = filteredRecords.map((r: any) => [
      `${r.employees?.first_name || ""} ${r.employees?.last_name || ""}`,
      r.employees?.departments?.name || "",
      r.status,
      r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "",
      r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "",
      r.worked_hours != null ? r.worked_hours.toFixed(1) : "",
      r.overtime_hours != null ? r.overtime_hours.toFixed(1) : "0",
      r.notes || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleEditRecord(record: any) {
    setEditRecord(record);
    setEditDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {myEmployee && (
            <>
              {!myTodayRecord ? (
                <Button onClick={() => clockIn.mutate()} disabled={clockIn.isPending} className="gap-2">
                  <LogIn className="h-4 w-4" /> {clockIn.isPending ? "Clocking in..." : "Clock In"}
                </Button>
              ) : !myTodayRecord.clock_out ? (
                <Button onClick={() => clockOut.mutate()} disabled={clockOut.isPending} variant="outline" className="gap-2">
                  <LogOut className="h-4 w-4" /> {clockOut.isPending ? "Clocking out..." : "Clock Out"}
                </Button>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> {myTodayRecord.worked_hours?.toFixed(1)}h logged
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          {isAdminOrHR && <TabsTrigger value="exceptions">Exceptions</TabsTrigger>}
          <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
          {isAdminOrHR && <TabsTrigger value="regularizations">Regularizations</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {isAdminOrHR && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
        </TabsList>

        {/* Daily View Tab */}
        <TabsContent value="daily" className="space-y-4">
          {/* Date nav + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              {isAdminOrHR && (
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {isAdminOrHR && (
                <>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setMarkDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> Mark
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV} disabled={!filteredRecords.length}>
                    <Download className="h-4 w-4" /> Export
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Summary cards */}
          {isAdminOrHR && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Present", value: stats.present, total: totalHeadcount, color: "text-green-600 dark:text-green-400" },
                { label: "Absent", value: stats.absent, total: totalHeadcount, color: "text-destructive" },
                { label: "Late", value: stats.late, total: totalHeadcount, color: "text-yellow-600 dark:text-yellow-400" },
                { label: "On Leave", value: stats.onLeave, total: totalHeadcount, color: "text-muted-foreground" },
                { label: "Unaccounted", value: stats.unaccounted, total: totalHeadcount, color: "text-orange-600 dark:text-orange-400" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}<span className="text-sm font-normal text-muted-foreground">/{s.total}</span></p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Variance Board */}
          {isAdminOrHR && <VarianceBoard date={selectedDate} departmentFilter={departmentFilter} />}

          {/* Unaccounted employees */}
          {isAdminOrHR && unaccounted.length > 0 && (
            <Collapsible open={missingOpen} onOpenChange={setMissingOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                  <span className="flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    {unaccounted.length} employee{unaccounted.length !== 1 ? "s" : ""} unaccounted
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${missingOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {unaccounted.map((e) => (
                        <Badge key={e.id} variant="outline" className="text-xs">
                          {e.first_name} {e.last_name}
                          <span className="text-muted-foreground ml-1">({e.departments?.name || "—"})</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Records table */}
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredRecords.length ? (
            isMobile ? (
              <div className="space-y-2">
                {filteredRecords.map((r: any) => (
                  <Card key={r.id} className={isAdminOrHR ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""} onClick={() => isAdminOrHR && handleEditRecord(r)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{r.employees?.first_name} {r.employees?.last_name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.employees?.departments?.name || "—"}</p>
                        </div>
                        <StatusChip status={statusStyleMap[r.status] || "pending"} label={r.status.replace("_", " ")} />
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {r.clock_in && <span>In: {format(new Date(r.clock_in), "hh:mm a")}</span>}
                        {r.clock_out && <span>Out: {format(new Date(r.clock_out), "hh:mm a")}</span>}
                        {r.worked_hours != null && <span>{r.worked_hours.toFixed(1)}h</span>}
                        {r.overtime_hours != null && r.overtime_hours > 0 && <span className="text-yellow-600">+{r.overtime_hours.toFixed(1)}h OT</span>}
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
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>OT</TableHead>
                        <TableHead className="w-10">📍</TableHead>
                        {isAdminOrHR && <TableHead className="w-10"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((r: any) => (
                        <TableRow key={r.id} className={isAdminOrHR ? "cursor-pointer" : ""} onClick={() => isAdminOrHR && handleEditRecord(r)}>
                          <TableCell className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.employees?.departments?.name || "—"}</TableCell>
                          <TableCell><StatusChip status={statusStyleMap[r.status] || "pending"} label={r.status.replace("_", " ")} /></TableCell>
                          <TableCell>{r.clock_in ? format(new Date(r.clock_in), "hh:mm a") : "—"}</TableCell>
                          <TableCell>{r.clock_out ? format(new Date(r.clock_out), "hh:mm a") : "—"}</TableCell>
                          <TableCell>{r.worked_hours != null ? `${r.worked_hours.toFixed(1)}h` : "—"}</TableCell>
                          <TableCell>{r.overtime_hours != null && r.overtime_hours > 0 ? <span className="text-yellow-600">{r.overtime_hours.toFixed(1)}h</span> : "—"}</TableCell>
                          <TableCell>
                            {r.geo_lat && r.geo_lng ? (
                              <a
                                href={`https://www.google.com/maps?q=${r.geo_lat},${r.geo_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={`${r.geo_lat.toFixed(4)}, ${r.geo_lng.toFixed(4)}`}
                              >
                                <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          {isAdminOrHR && (
                            <TableCell><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                          )}
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
                <EmptyState icon={Users} title="No attendance records" description={searchQuery ? "No records match your search." : "No records found for this date."} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Exceptions Tab */}
        {isAdminOrHR && (
          <TabsContent value="exceptions">
            <ExceptionInbox />
          </TabsContent>
        )}

        {/* My Attendance Tab */}
        <TabsContent value="my-attendance">
          <MyAttendanceView />
        </TabsContent>

        {/* Regularizations Tab */}
        {isAdminOrHR && (
          <TabsContent value="regularizations">
            <RegularizationReviewList />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {isAdminOrHR && (
          <TabsContent value="analytics">
            <AttendanceAnalytics />
          </TabsContent>
        )}

        {/* Payroll Tab */}
        {isAdminOrHR && (
          <TabsContent value="payroll">
            <PayrollReadinessView />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <MarkAttendanceDialog
        open={markDialogOpen}
        onOpenChange={setMarkDialogOpen}
        date={selectedDate}
        employees={allEmployees || []}
        existingRecordIds={recordedIds}
      />
      <EditAttendanceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={editRecord}
      />
    </div>
  );
}
