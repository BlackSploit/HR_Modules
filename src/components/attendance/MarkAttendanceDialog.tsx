import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AbsenceReasonSelect } from "@/components/attendance/AbsenceReasonSelect";
import { useGeolocation } from "@/hooks/use-geolocation";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

interface MarkAttendanceDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  employees: { id: string; first_name: string; last_name: string; department_id: string | null; departments: { name: string } | null }[];
  existingRecordIds: Set<string>;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
  { value: "holiday", label: "Holiday" },
];

export function MarkAttendanceDialog({ open, onOpenChange, date, employees, existingRecordIds }: MarkAttendanceDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getLocation } = useGeolocation();
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("present");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes] = useState("");
  const [absenceReasonId, setAbsenceReasonId] = useState("");
  const [captureGeo, setCaptureGeo] = useState(false);
  const [capturedLoc, setCapturedLoc] = useState<{ lat: number; lng: number } | null>(null);

  const unrecordedEmployees = employees.filter((e) => !existingRecordIds.has(e.id));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Select an employee");

      const loc = captureGeo ? (capturedLoc || await getLocation()) : null;
      if (captureGeo && !capturedLoc && loc) setCapturedLoc(loc);
      const geoFields = { geo_lat: loc?.lat ?? null, geo_lng: loc?.lng ?? null };

      const clockInTs = clockIn ? new Date(`${date}T${clockIn}`).toISOString() : null;
      const clockOutTs = clockOut ? new Date(`${date}T${clockOut}`).toISOString() : null;
      let workedHours: number | null = null;
      if (clockInTs && clockOutTs) {
        workedHours = Math.round(((new Date(clockOutTs).getTime() - new Date(clockInTs).getTime()) / 3600000) * 100) / 100;
      }

      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", date)
        .maybeSingle();

      const reasonId = (status === "absent" || status === "on_leave") && absenceReasonId ? absenceReasonId : null;

      if (existing) {
        const { error } = await supabase
          .from("attendance_records")
          .update({ status, clock_in: clockInTs, clock_out: clockOutTs, worked_hours: workedHours, notes: notes || null, marked_by: user?.id, absence_reason_id: reasonId, ...geoFields })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("attendance_records")
          .insert({ employee_id: employeeId, date, status, clock_in: clockInTs, clock_out: clockOutTs, worked_hours: workedHours, notes: notes || null, marked_by: user?.id, absence_reason_id: reasonId, ...geoFields });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Attendance marked successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-today"] });
      onOpenChange(false);
      setEmployeeId("");
      setStatus("present");
      setClockIn("");
      setClockOut("");
      setNotes("");
      setAbsenceReasonId("");
      setCaptureGeo(false);
      setCapturedLoc(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {unrecordedEmployees.length > 0 && (
                  <>
                    <SelectItem value="__header_unrecorded" disabled>— Unrecorded —</SelectItem>
                    {unrecordedEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </>
                )}
                {employees.filter(e => existingRecordIds.has(e.id)).length > 0 && (
                  <>
                    <SelectItem value="__header_recorded" disabled>— Already Recorded —</SelectItem>
                    {employees.filter(e => existingRecordIds.has(e.id)).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} (update)</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(status === "absent" || status === "on_leave") && (
            <AbsenceReasonSelect value={absenceReasonId} onValueChange={setAbsenceReasonId} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Clock In</Label>
              <Input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
            </div>
            <div>
              <Label>Clock Out</Label>
              <Input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="capture-geo" className="text-sm">Capture Location</Label>
            </div>
            <Switch id="capture-geo" checked={captureGeo} onCheckedChange={setCaptureGeo} />
          </div>
          {capturedLoc && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" />
              Location captured: {capturedLoc.lat.toFixed(4)}, {capturedLoc.lng.toFixed(4)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!employeeId || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Mark Attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
