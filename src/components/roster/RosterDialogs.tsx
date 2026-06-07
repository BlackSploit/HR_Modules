import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, eachDayOfInterval } from "date-fns";
import FatigueWarnings from "./FatigueWarnings";
import EligibilityBadges from "./EligibilityBadges";

interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  departments: { name: string } | null;
}

// ─── Assign / Edit Dialog ─────────────────────────
interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  prefillEmployeeId?: string;
  existingAssignment?: { id: string; shift_template_id: string } | null;
  onAssign: (employeeId: string, shiftId: string) => void;
  onUpdate: (assignmentId: string, shiftId: string) => void;
  onDelete: (assignmentId: string) => void;
  isPending: boolean;
  assignments?: { employee_id: string; date: string }[];
  weekLocked?: boolean;
}

export function AssignDialog({
  open, onOpenChange, date, employees, shiftTemplates,
  prefillEmployeeId, existingAssignment, onAssign, onUpdate, onDelete, isPending,
  assignments = [], weekLocked,
}: AssignDialogProps) {
  const [employeeId, setEmployeeId] = useState(prefillEmployeeId || "");
  const [shiftId, setShiftId] = useState(existingAssignment?.shift_template_id || "");

  useEffect(() => {
    if (open) {
      setEmployeeId(prefillEmployeeId || "");
      setShiftId(existingAssignment?.shift_template_id || "");
    }
  }, [open, prefillEmployeeId, existingAssignment]);

  const handleOpen = (v: boolean) => {
    onOpenChange(v);
  };

  const isEdit = !!existingAssignment;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "Assign"} Shift — {date && format(date, "EEE, MMM d")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {weekLocked && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-center">
              This week is locked. Edits are disabled.
            </div>
          )}
          {!isEdit && !prefillEmployeeId && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={weekLocked}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isEdit && prefillEmployeeId && (() => {
            const emp = employees.find((e) => e.id === prefillEmployeeId);
            return (
              <div className="space-y-2">
                <Label>Employee</Label>
                <div className="text-sm font-medium p-2 bg-muted rounded-md">
                  {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                </div>
              </div>
            );
          })()}

          {/* Eligibility Badges */}
          {employeeId && date && (
            <EligibilityBadges
              employeeId={employeeId}
              targetDate={date}
              assignments={assignments}
            />
          )}

          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={shiftId} onValueChange={setShiftId} disabled={weekLocked}>
              <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>
                {shiftTemplates.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#3b82f6" }} />
                      {s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fatigue Warnings */}
          {employeeId && shiftId && date && (
            <FatigueWarnings
              employeeId={employeeId}
              targetDate={date}
              targetShiftId={shiftId}
              shiftTemplates={shiftTemplates}
            />
          )}

          <div className="flex justify-between pt-2">
            <div>
              {isEdit && !weekLocked && (
                <Button variant="destructive" size="sm" onClick={() => onDelete(existingAssignment!.id)} disabled={isPending}>
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
              <Button
                onClick={() => isEdit ? onUpdate(existingAssignment!.id, shiftId) : onAssign(employeeId, shiftId)}
                disabled={(!isEdit && !employeeId) || !shiftId || isPending || weekLocked}
              >
                {isPending ? "Saving..." : isEdit ? "Update" : "Assign"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Assign Dialog ─────────────────────────
interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  onBulkAssign: (employeeIds: string[], shiftId: string, dates: string[]) => void;
  isPending: boolean;
}

export function BulkAssignDialog({ open, onOpenChange, employees, shiftTemplates, onBulkAssign, isPending }: BulkAssignDialogProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    if (!startDate || !endDate || !shiftId || selectedEmployees.length === 0) return;
    const dates = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }).map((d) => format(d, "yyyy-MM-dd"));
    onBulkAssign(selectedEmployees, shiftId, dates);
  };

  const handleOpen = (v: boolean) => {
    if (v) {
      setSelectedEmployees([]);
      setShiftId("");
      setStartDate("");
      setEndDate("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Assign Shifts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>
                {shiftTemplates.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#3b82f6" }} />
                      {s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Select Employees ({selectedEmployees.length} selected)</Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
              {employees.map((e) => (
                <label key={e.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox checked={selectedEmployees.includes(e.id)} onCheckedChange={() => toggleEmployee(e.id)} />
                  <span>{e.first_name} {e.last_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{e.departments?.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending || selectedEmployees.length === 0 || !shiftId || !startDate || !endDate}>
              {isPending ? "Assigning..." : `Assign ${selectedEmployees.length} employees`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
