import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AbsenceReasonSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  showLabel?: boolean;
}

export function AbsenceReasonSelect({ value, onValueChange, showLabel = true }: AbsenceReasonSelectProps) {
  const { data: reasons } = useQuery({
    queryKey: ["absence-reasons"],
    queryFn: async () => {
      const { data } = await supabase.from("absence_reasons").select("*").eq("is_active", true).order("category").order("name");
      return data || [];
    },
  });

  const grouped = (reasons || []).reduce<Record<string, typeof reasons>>((acc, r) => {
    const cat = r.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(r);
    return acc;
  }, {});

  return (
    <div>
      {showLabel && <Label>Absence Reason</Label>}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
        <SelectContent>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <SelectItem value={`__cat_${cat}`} disabled className="text-xs font-semibold uppercase text-muted-foreground">
                — {cat} —
              </SelectItem>
              {items!.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} {r.requires_document && "📎"}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
