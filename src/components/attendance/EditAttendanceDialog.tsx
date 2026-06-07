import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AbsenceReasonSelect } from "@/components/attendance/AbsenceReasonSelect";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin } from "lucide-react";

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: any | null;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
  { value: "holiday", label: "Holiday" },
];

export function EditAttendanceDialog({ open, onOpenChange, record }: EditAttendanceDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("present");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes] = useState("");
  const [absenceReasonId, setAbsenceReasonId] = useState("");

  useEffect(() => {
    if (open && record) {
      setStatus(record.status || "present");
      setClockIn(record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "");
      setClockOut(record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "");
      setNotes(record.notes || "");
      setAbsenceReasonId(record.absence_reason_id || "");
    }
  }, [open, record]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!record?.id) throw new Error("No record selected");

      const clockInTs = clockIn ? new Date(`${record.date}T${clockIn}`).toISOString() : null;
      const clockOutTs = clockOut ? new Date(`${record.date}T${clockOut}`).toISOString() : null;
      let workedHours: number | null = null;
      if (clockInTs && clockOutTs) {
        workedHours = Math.round(((new Date(clockOutTs).getTime() - new Date(clockInTs).getTime()) / 3600000) * 100) / 100;
      }

      const reasonId = (status === "absent" || status === "on_leave") && absenceReasonId ? absenceReasonId : null;

      const { error } = await supabase
        .from("attendance_records")
        .update({ status, clock_in: clockInTs, clock_out: clockOutTs, worked_hours: workedHours, notes: notes || null, absence_reason_id: reasonId })
        .eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record updated successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-today"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const employeeName = record ? `${record.employees?.first_name || ""} ${record.employees?.last_name || ""}`.trim() : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance — {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Regularization reason..." rows={2} />
          </div>
          {record?.geo_lat && record?.geo_lng ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Location: {record.geo_lat.toFixed(4)}, {record.geo_lng.toFixed(4)}</span>
              <a
                href={`https://www.google.com/maps?q=${record.geo_lat},${record.geo_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline ml-auto"
              >
                View on Map
              </a>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> No location data captured
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Update Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
