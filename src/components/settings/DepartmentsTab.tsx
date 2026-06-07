import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCrudTable } from "./SettingsCrudTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

interface Dept { id: string; name: string; description: string | null; branch_id: string | null; is_active: boolean; }
const empty: Dept = { id: "", name: "", description: null, branch_id: null, is_active: true };

function DeptForm({ initial, onChange }: { initial: Dept | null; onChange: (d: Dept) => void }) {
  const [f, setF] = useState<Dept>(initial || empty);
  useEffect(() => { onChange(f); }, [f]);
  useEffect(() => { setF(initial || empty); }, [initial]);
  const { data: branches = [] } = useQuery({
    queryKey: ["settings-branches"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name").eq("is_active", true); return data || []; },
  });
  const set = (k: keyof Dept, v: any) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-3">
      <div><Label>Name *</Label><Input value={f.name} onChange={e => set("name", e.target.value)} /></div>
      <div><Label>Description</Label><Input value={f.description || ""} onChange={e => set("description", e.target.value)} /></div>
      <div>
        <Label>Branch</Label>
        <Select value={f.branch_id || ""} onValueChange={v => set("branch_id", v || null)}>
          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /><Label>Active</Label></div>
    </div>
  );
}

export function DepartmentsTab() {
  const qc = useQueryClient();
  const { data: branches = [] } = useQuery({
    queryKey: ["settings-branches"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name"); return data || []; },
  });
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const { data = [], isLoading } = useQuery({
    queryKey: ["settings-departments"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("*").order("name"); return (data || []) as Dept[]; },
  });
  return (
    <SettingsCrudTable<Dept>
      title="Departments"
      data={data}
      columns={[
        { key: "name", label: "Name" },
        { key: "branch_id", label: "Branch", render: (i) => branchMap[i.branch_id || ""] || "—" },
        { key: "is_active", label: "Status" },
      ]}
      loading={isLoading}
      emptyItem={empty}
      getId={i => i.id}
      onSave={async (item, isNew) => {
        const { id, ...rest } = item;
        if (isNew) { const { error } = await supabase.from("departments").insert(rest as any); if (error) throw error; }
        else { const { error } = await supabase.from("departments").update(rest as any).eq("id", id); if (error) throw error; }
        qc.invalidateQueries({ queryKey: ["settings-departments"] });
      }}
      formContent={(editItem, onChange) => <DeptForm initial={editItem} onChange={onChange} />}
    />
  );
}
