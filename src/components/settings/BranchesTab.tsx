import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCrudTable } from "./SettingsCrudTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

interface Branch { id: string; name: string; city: string | null; state: string | null; phone: string | null; address: string | null; pincode: string | null; is_active: boolean; }
const empty: Branch = { id: "", name: "", city: null, state: null, phone: null, address: null, pincode: null, is_active: true };

function BranchForm({ initial, onChange }: { initial: Branch | null; onChange: (b: Branch) => void }) {
  const [f, setF] = useState<Branch>(initial || empty);
  useEffect(() => { onChange(f); }, [f]);
  useEffect(() => { setF(initial || empty); }, [initial]);
  const set = (k: keyof Branch, v: any) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-3">
      <div><Label>Name *</Label><Input value={f.name} onChange={e => set("name", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>City</Label><Input value={f.city || ""} onChange={e => set("city", e.target.value)} /></div>
        <div><Label>State</Label><Input value={f.state || ""} onChange={e => set("state", e.target.value)} /></div>
      </div>
      <div><Label>Phone</Label><Input value={f.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /><Label>Active</Label></div>
    </div>
  );
}

export function BranchesTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["settings-branches"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("*").order("name"); return (data || []) as Branch[]; },
  });
  return (
    <SettingsCrudTable<Branch>
      title="Branches"
      data={data}
      columns={[
        { key: "name", label: "Name" },
        { key: "city", label: "City" },
        { key: "phone", label: "Phone" },
        { key: "is_active", label: "Status" },
      ]}
      loading={isLoading}
      emptyItem={empty}
      getId={i => i.id}
      onSave={async (item, isNew) => {
        const { id, ...rest } = item;
        if (isNew) { const { error } = await supabase.from("branches").insert(rest as any); if (error) throw error; }
        else { const { error } = await supabase.from("branches").update(rest as any).eq("id", id); if (error) throw error; }
        qc.invalidateQueries({ queryKey: ["settings-branches"] });
      }}
      formContent={(editItem, onChange) => <BranchForm initial={editItem} onChange={onChange} />}
    />
  );
}
