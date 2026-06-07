import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCrudTable } from "./SettingsCrudTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

interface Center { id: string; branch_id: string; total_beds: number; is_active: boolean; }
const empty: Center = { id: "", branch_id: "", total_beds: 0, is_active: true };

function CenterForm({ initial, onChange }: { initial: Center | null; onChange: (c: Center) => void }) {
  const [f, setF] = useState<Center>(initial || empty);
  useEffect(() => { onChange(f); }, [f]);
  useEffect(() => { setF(initial || empty); }, [initial]);
  const { data: branches = [] } = useQuery({
    queryKey: ["settings-branches"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name").eq("is_active", true); return data || []; },
  });
  const set = (k: keyof Center, v: any) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-3">
      <div>
        <Label>Branch *</Label>
        <Select value={f.branch_id} onValueChange={v => set("branch_id", v)}>
          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Total Beds</Label><Input type="number" value={f.total_beds} onChange={e => set("total_beds", Number(e.target.value))} /></div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /><Label>Active</Label></div>
    </div>
  );
}

export function CenterConfigTab() {
  const qc = useQueryClient();
  const { data: branches = [] } = useQuery({
    queryKey: ["settings-branches"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name"); return data || []; },
  });
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const { data = [], isLoading } = useQuery({
    queryKey: ["settings-centers"],
    queryFn: async () => { const { data } = await supabase.from("center_config").select("*").order("created_at"); return (data || []) as Center[]; },
  });
  return (
    <SettingsCrudTable<Center>
      title="Center Configurations"
      data={data}
      columns={[
        { key: "branch_id", label: "Branch", render: (i) => branchMap[i.branch_id] || "—" },
        { key: "total_beds", label: "Beds" },
        { key: "is_active", label: "Status" },
      ]}
      loading={isLoading}
      emptyItem={empty}
      getId={i => i.id}
      onSave={async (item, isNew) => {
        const { id, ...rest } = item;
        if (isNew) { const { error } = await supabase.from("center_config").insert(rest as any); if (error) throw error; }
        else { const { error } = await supabase.from("center_config").update(rest as any).eq("id", id); if (error) throw error; }
        qc.invalidateQueries({ queryKey: ["settings-centers"] });
      }}
      formContent={(editItem, onChange) => <CenterForm initial={editItem} onChange={onChange} />}
    />
  );
}
