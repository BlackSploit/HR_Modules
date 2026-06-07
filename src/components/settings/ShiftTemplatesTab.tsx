import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCrudTable } from "./SettingsCrudTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

interface Shift { id: string; name: string; start_time: string; end_time: string; break_minutes: number; color: string | null; is_active: boolean; }
const empty: Shift = { id: "", name: "", start_time: "06:00", end_time: "14:00", break_minutes: 30, color: "#3b82f6", is_active: true };

function ShiftForm({ initial, onChange }: { initial: Shift | null; onChange: (s: Shift) => void }) {
  const [f, setF] = useState<Shift>(initial || empty);
  useEffect(() => { onChange(f); }, [f]);
  useEffect(() => { setF(initial || empty); }, [initial]);
  const set = (k: keyof Shift, v: any) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-3">
      <div><Label>Name *</Label><Input value={f.name} onChange={e => set("name", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Start Time</Label><Input type="time" value={f.start_time} onChange={e => set("start_time", e.target.value)} /></div>
        <div><Label>End Time</Label><Input type="time" value={f.end_time} onChange={e => set("end_time", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Break (min)</Label><Input type="number" value={f.break_minutes} onChange={e => set("break_minutes", Number(e.target.value))} /></div>
        <div><Label>Color</Label><Input type="color" value={f.color || "#3b82f6"} onChange={e => set("color", e.target.value)} className="h-9" /></div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /><Label>Active</Label></div>
    </div>
  );
}

export function ShiftTemplatesTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["settings-shifts"],
    queryFn: async () => { const { data } = await supabase.from("shift_templates").select("*").order("start_time"); return (data || []) as Shift[]; },
  });
  return (
    <SettingsCrudTable<Shift>
      title="Shift Templates"
      data={data}
      columns={[
        { key: "name", label: "Name", render: (i) => (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.color || "#3b82f6" }} />
            {i.name}
          </div>
        )},
        { key: "start_time", label: "Start" },
        { key: "end_time", label: "End" },
        { key: "break_minutes", label: "Break (min)" },
        { key: "is_active", label: "Status" },
      ]}
      loading={isLoading}
      emptyItem={empty}
      getId={i => i.id}
      onSave={async (item, isNew) => {
        const { id, ...rest } = item;
        if (isNew) { const { error } = await supabase.from("shift_templates").insert(rest as any); if (error) throw error; }
        else { const { error } = await supabase.from("shift_templates").update(rest as any).eq("id", id); if (error) throw error; }
        qc.invalidateQueries({ queryKey: ["settings-shifts"] });
      }}
      formContent={(editItem, onChange) => <ShiftForm initial={editItem} onChange={onChange} />}
    />
  );
}
