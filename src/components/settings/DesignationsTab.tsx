import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCrudTable } from "./SettingsCrudTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

interface Desig { id: string; title: string; department_id: string | null; level: number | null; is_active: boolean; }
const empty: Desig = { id: "", title: "", department_id: null, level: null, is_active: true };

function DesigForm({ initial, onChange }: { initial: Desig | null; onChange: (d: Desig) => void }) {
  const [f, setF] = useState<Desig>(initial || empty);
  useEffect(() => { onChange(f); }, [f]);
  useEffect(() => { setF(initial || empty); }, [initial]);
  const { data: depts = [] } = useQuery({
    queryKey: ["settings-departments"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("id, name").eq("is_active", true); return data || []; },
  });
  const set = (k: keyof Desig, v: any) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-3">
      <div><Label>Title *</Label><Input value={f.title} onChange={e => set("title", e.target.value)} /></div>
      <div>
        <Label>Department</Label>
        <Select value={f.department_id || ""} onValueChange={v => set("department_id", v || null)}>
          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Level</Label><Input type="number" value={f.level ?? ""} onChange={e => set("level", e.target.value ? Number(e.target.value) : null)} /></div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /><Label>Active</Label></div>
    </div>
  );
}

export function DesignationsTab() {
  const qc = useQueryClient();
  const { data: depts = [] } = useQuery({
    queryKey: ["settings-departments"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("id, name"); return data || []; },
  });
  const deptMap = Object.fromEntries(depts.map(d => [d.id, d.name]));
  const { data = [], isLoading } = useQuery({
    queryKey: ["settings-designations"],
    queryFn: async () => { const { data } = await supabase.from("designations").select("*").order("title"); return (data || []) as Desig[]; },
  });
  return (
    <SettingsCrudTable<Desig>
      title="Designations"
      data={data}
      columns={[
        { key: "title", label: "Title" },
        { key: "department_id", label: "Department", render: (i) => deptMap[i.department_id || ""] || "—" },
        { key: "level", label: "Level" },
        { key: "is_active", label: "Status" },
      ]}
      loading={isLoading}
      emptyItem={empty}
      getId={i => i.id}
      onSave={async (item, isNew) => {
        const { id, ...rest } = item;
        if (isNew) { const { error } = await supabase.from("designations").insert(rest as any); if (error) throw error; }
        else { const { error } = await supabase.from("designations").update(rest as any).eq("id", id); if (error) throw error; }
        qc.invalidateQueries({ queryKey: ["settings-designations"] });
      }}
      formContent={(editItem, onChange) => <DesigForm initial={editItem} onChange={onChange} />}
    />
  );
}
