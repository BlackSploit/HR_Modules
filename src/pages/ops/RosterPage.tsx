import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, Plus, Copy, Users, LayoutGrid, Calendar, Lock, Send, FileEdit } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import TodayDutyBoard from "@/components/roster/TodayDutyBoard";
import WeeklyGridView from "@/components/roster/WeeklyGridView";
import { AssignDialog, BulkAssignDialog } from "@/components/roster/RosterDialogs";

export default function RosterPage() {
  const { isAdminOrHR, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<string>("board");
  const [boardDate, setBoardDate] = useState<Date>(() => new Date());

  // Dialogs
  const [showAssign, setShowAssign] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [assignDate, setAssignDate] = useState<Date | null>(null);
  const [prefillEmployeeId, setPrefillEmployeeId] = useState<string | undefined>();
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; shift_template_id: string } | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

  // ─── Queries ─────────────────────────
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: shiftTemplates } = useQuery({
    queryKey: ["shift-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("shift_templates").select("*").eq("is_active", true).order("start_time");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-roster", departmentFilter],
    queryFn: async () => {
      let q = supabase.from("employees").select("id, first_name, last_name, department_id, departments(name)").eq("status", "active").order("first_name");
      if (departmentFilter !== "all") q = q.eq("department_id", departmentFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["roster-assignments", startDate, departmentFilter],
    queryFn: async () => {
      let q = supabase
        .from("roster_assignments")
        .select("*, employees(id, first_name, last_name, department_id), shift_templates(name, start_time, end_time, color)")
        .gte("date", startDate)
        .lte("date", endDate)
        .neq("status", "cancelled");
      const { data } = await q;
      return data || [];
    },
  });

  const { data: leaves } = useQuery({
    queryKey: ["leaves-week", startDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("employee_id, start_date, end_date")
        .eq("status", "approved")
        .lte("start_date", endDate)
        .gte("end_date", startDate);
      return data || [];
    },
  });

  // Attendance records for today (for variance dots)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: attendanceRecords } = useQuery({
    queryKey: ["attendance-today", todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, clock_in")
        .eq("date", todayStr);
      return data || [];
    },
  });

  // Week status (draft/published/locked)
  const { data: weekStatus } = useQuery({
    queryKey: ["roster-week-status", startDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_week_status")
        .select("*")
        .eq("week_start_date", startDate)
        .maybeSingle();
      return data;
    },
  });

  const currentStatus = weekStatus?.status || "draft";
  const isLocked = currentStatus === "locked";
  const isPublished = currentStatus === "published" || currentStatus === "locked";

  // ─── Filtered ─────────────────────────
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    if (departmentFilter === "all") return assignments;
    return assignments.filter((a: any) => a.employees?.department_id === departmentFilter);
  }, [assignments, departmentFilter]);

  // ─── Mutations ─────────────────────────
  const invalidateRoster = () => {
    queryClient.invalidateQueries({ queryKey: ["roster-assignments"] });
    queryClient.invalidateQueries({ queryKey: ["roster-week-status"] });
  };

  const assignMutation = useMutation({
    mutationFn: async ({ employee_id, shift_template_id, date }: { employee_id: string; shift_template_id: string; date: string }) => {
      const { data: existing } = await supabase
        .from("roster_assignments")
        .select("id, status")
        .eq("employee_id", employee_id)
        .eq("date", date)
        .maybeSingle();

      if (existing && existing.status !== "cancelled") {
        throw new Error("This employee already has a shift assigned on this date");
      }

      if (existing && existing.status === "cancelled") {
        const { error } = await supabase
          .from("roster_assignments")
          .update({ shift_template_id, status: "scheduled" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("roster_assignments")
          .insert({ employee_id, shift_template_id, date });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Shift assigned" });
      invalidateRoster();
      setShowAssign(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, shift_template_id }: { id: string; shift_template_id: string }) => {
      const { error } = await supabase.from("roster_assignments").update({ shift_template_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Shift updated" });
      invalidateRoster();
      setShowAssign(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roster_assignments").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Shift removed" });
      invalidateRoster();
      setShowAssign(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ employeeIds, shiftId, dates }: { employeeIds: string[]; shiftId: string; dates: string[] }) => {
      const pairs = employeeIds.flatMap((eid) => dates.map((d) => ({ employee_id: eid, date: d })));
      const toInsert: { employee_id: string; shift_template_id: string; date: string }[] = [];
      const toUpdate: { id: string; shift_template_id: string }[] = [];

      for (const pair of pairs) {
        const { data: existing } = await supabase
          .from("roster_assignments")
          .select("id, status")
          .eq("employee_id", pair.employee_id)
          .eq("date", pair.date)
          .maybeSingle();

        if (existing && existing.status !== "cancelled") continue;
        if (existing && existing.status === "cancelled") {
          toUpdate.push({ id: existing.id, shift_template_id: shiftId });
        } else {
          toInsert.push({ employee_id: pair.employee_id, shift_template_id: shiftId, date: pair.date });
        }
      }

      if (toUpdate.length) {
        for (const u of toUpdate) {
          const { error } = await supabase
            .from("roster_assignments")
            .update({ shift_template_id: u.shift_template_id, status: "scheduled" })
            .eq("id", u.id);
          if (error) throw error;
        }
      }
      if (toInsert.length) {
        const { error } = await supabase.from("roster_assignments").insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Bulk shifts assigned` });
      invalidateRoster();
      setShowBulk(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const prevStart = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
      const prevEnd = format(addDays(subWeeks(weekStart, 1), 6), "yyyy-MM-dd");
      const { data: prevAssignments } = await supabase
        .from("roster_assignments")
        .select("employee_id, shift_template_id, date")
        .gte("date", prevStart)
        .lte("date", prevEnd)
        .neq("status", "cancelled");
      if (!prevAssignments?.length) throw new Error("No assignments found in previous week");
      const newRows = prevAssignments.map((a) => ({
        employee_id: a.employee_id,
        shift_template_id: a.shift_template_id,
        date: format(addDays(new Date(a.date + "T00:00:00"), 7), "yyyy-MM-dd"),
      }));
      const { error } = await supabase.from("roster_assignments").insert(newRows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Previous week copied" });
      invalidateRoster();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Week status mutations
  const publishMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (weekStatus?.id) {
        const { error } = await supabase
          .from("roster_week_status")
          .update({
            status: newStatus,
            published_by: user?.id,
            published_at: new Date().toISOString(),
          })
          .eq("id", weekStatus.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("roster_week_status")
          .insert({
            week_start_date: startDate,
            status: newStatus,
            published_by: user?.id,
            published_at: newStatus !== "draft" ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, newStatus) => {
      toast({ title: newStatus === "published" ? "Roster published" : newStatus === "locked" ? "Roster locked" : "Roster unlocked" });
      invalidateRoster();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ─── Cell click handler for grid ─────────────────────────
  const handleCellClick = (employeeId: string, date: Date, existingAssignment?: any) => {
    if (!isAdminOrHR) return;
    setAssignDate(date);
    setPrefillEmployeeId(employeeId);
    setEditingAssignment(existingAssignment ? { id: existingAssignment.id, shift_template_id: existingAssignment.shift_template_id } : null);
    setShowAssign(true);
  };

  const statusBadge = currentStatus === "locked" ? (
    <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
      <Lock className="h-3 w-3 mr-1" /> Locked
    </Badge>
  ) : currentStatus === "published" ? (
    <Badge className="bg-success/10 text-success border-success/20" variant="outline">
      <Send className="h-3 w-3 mr-1" /> Published
    </Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground" variant="outline">
      <FileEdit className="h-3 w-3 mr-1" /> Draft
    </Badge>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shift Roster</h1>
            <p className="text-sm text-muted-foreground">
              Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isAdminOrHR && (
            <>
              <Button variant="outline" size="sm" onClick={() => copyWeekMutation.mutate()} disabled={copyWeekMutation.isPending || isLocked}>
                <Copy className="h-3.5 w-3.5 mr-1" /> {copyWeekMutation.isPending ? "Copying..." : "Copy Last Week"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBulk(true)} disabled={isLocked}>
                <Users className="h-3.5 w-3.5 mr-1" /> Bulk Assign
              </Button>
              {currentStatus === "draft" && (
                <Button size="sm" onClick={() => publishMutation.mutate("published")} disabled={publishMutation.isPending}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Publish
                </Button>
              )}
              {currentStatus === "published" && (
                <>
                  <Button size="sm" variant="destructive" onClick={() => publishMutation.mutate("locked")} disabled={publishMutation.isPending}>
                    <Lock className="h-3.5 w-3.5 mr-1" /> Lock
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => publishMutation.mutate("draft")} disabled={publishMutation.isPending}>
                    Unpublish
                  </Button>
                </>
              )}
              {currentStatus === "locked" && (
                <Button size="sm" variant="outline" onClick={() => publishMutation.mutate("published")} disabled={publishMutation.isPending}>
                  Unlock
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={setViewMode} className="ml-auto">
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> Duty Board
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1.5 text-xs">
              <LayoutGrid className="h-3.5 w-3.5" /> Week Grid
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : viewMode === "board" ? (
        <TodayDutyBoard
          assignments={filteredAssignments as any}
          employees={(employees as any) || []}
          shiftTemplates={(shiftTemplates as any) || []}
          leaves={(leaves as any) || []}
          selectedDate={boardDate}
          weekDays={weekDays}
          onDateChange={setBoardDate}
          onAssignClick={isAdminOrHR && !isLocked ? () => { setAssignDate(boardDate); setPrefillEmployeeId(undefined); setEditingAssignment(null); setShowAssign(true); } : undefined}
          attendanceRecords={(attendanceRecords as any) || []}
          departments={(departments as any) || []}
        />
      ) : (
        <WeeklyGridView
          employees={(employees as any) || []}
          assignments={filteredAssignments as any}
          weekDays={weekDays}
          leaves={(leaves as any) || []}
          onCellClick={handleCellClick}
        />
      )}

      {/* Assign/Edit Dialog */}
      <AssignDialog
        open={showAssign}
        onOpenChange={setShowAssign}
        date={assignDate}
        employees={(employees as any) || []}
        shiftTemplates={(shiftTemplates as any) || []}
        prefillEmployeeId={prefillEmployeeId}
        existingAssignment={editingAssignment}
        onAssign={(eid, sid) => assignDate && assignMutation.mutate({ employee_id: eid, shift_template_id: sid, date: format(assignDate, "yyyy-MM-dd") })}
        onUpdate={(id, sid) => updateMutation.mutate({ id, shift_template_id: sid })}
        onDelete={(id) => deleteMutation.mutate(id)}
        isPending={assignMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        assignments={(filteredAssignments || []).map((a: any) => ({ employee_id: a.employee_id, date: a.date }))}
        weekLocked={isLocked}
      />

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        open={showBulk}
        onOpenChange={setShowBulk}
        employees={(employees as any) || []}
        shiftTemplates={(shiftTemplates as any) || []}
        onBulkAssign={(eids, sid, dates) => bulkMutation.mutate({ employeeIds: eids, shiftId: sid, dates })}
        isPending={bulkMutation.isPending}
      />
    </div>
  );
}
