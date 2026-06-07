import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCrudTable } from "./SettingsCrudTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

interface Program { id: string; name: string; code: string; description: string | null; is_active: boolean; }
const empty: Program = { id: "", name: "", code: "", description: null, is_active: true };

function ProgramForm({ initial, onChange }: { initial: Program | null; onChange: (p: Program) => void }) {
  const [f, setF] = useState<Program>(initial || empty);
  useEffect(() => { onChange(f); }, [f]);
  useEffect(() => { setF(initial || empty); }, [initial]);
  const set = (k: keyof Program, v: any) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-3">
      <div><Label>Name *</Label><Input value={f.name} onChange={e => set("name", e.target.value)} /></div>
      <div><Label>Code *</Label><Input value={f.code} onChange={e => set("code", e.target.value.toUpperCase())} /></div>
      <div><Label>Description</Label><Textarea value={f.description || ""} onChange={e => set("description", e.target.value)} rows={2} /></div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /><Label>Active</Label></div>
    </div>
  );
}

export function ProgramsTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["settings-programs"],
    queryFn: async () => { const { data } = await supabase.from("programs").select("*").order("name"); return (data || []) as Program[]; },
  });
  return (
    <SettingsCrudTable<Program>
      title="Programs"
      data={data}
      columns={[
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "description", label: "Description" },
        { key: "is_active", label: "Status" },
      ]}
      loading={isLoading}
      emptyItem={empty}
      getId={i => i.id}
      onSave={async (item, isNew) => {
        const { id, ...rest } = item;
        if (isNew) { const { error } = await supabase.from("programs").insert(rest as any); if (error) throw error; }
        else { const { error } = await supabase.from("programs").update(rest as any).eq("id", id); if (error) throw error; }
        qc.invalidateQueries({ queryKey: ["settings-programs"] });
      }}
      formContent={(editItem, onChange) => <ProgramForm initial={editItem} onChange={onChange} />}
    />
  );
}
