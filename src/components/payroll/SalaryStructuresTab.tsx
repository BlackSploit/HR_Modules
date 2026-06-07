import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface SalaryForm {
  employee_id: string;
  basic_pay: number;
  hra: number;
  da: number;
  special_allowance: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  professional_tax: number;
  tds: number;
  other_deductions: number;
  effective_from: string;
}

const emptyForm: SalaryForm = {
  employee_id: "", basic_pay: 0, hra: 0, da: 0, special_allowance: 0,
  pf_employee: 0, pf_employer: 0, esi_employee: 0, esi_employer: 0,
  professional_tax: 0, tds: 0, other_deductions: 0, effective_from: new Date().toISOString().slice(0, 10),
};

export function SalaryStructuresTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SalaryForm>(emptyForm);
  const [search, setSearch] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["sal-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, first_name, last_name, departments(name)").eq("status", "active").order("first_name");
      return data || [];
    },
  });

  const { data: structures } = useQuery({
    queryKey: ["salary-structures"],
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_structures").select("*").eq("is_active", true).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const empMap = new Map((employees || []).map(e => [e.id, e]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.employee_id) throw new Error("Select an employee");
      if (editId) {
        const { error } = await supabase.from("employee_salary_structures").update({
          basic_pay: form.basic_pay, hra: form.hra, da: form.da, special_allowance: form.special_allowance,
          pf_employee: form.pf_employee, pf_employer: form.pf_employer, esi_employee: form.esi_employee,
          esi_employer: form.esi_employer, professional_tax: form.professional_tax, tds: form.tds,
          other_deductions: form.other_deductions, effective_from: form.effective_from,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_salary_structures").insert({
          employee_id: form.employee_id, basic_pay: form.basic_pay, hra: form.hra, da: form.da,
          special_allowance: form.special_allowance, pf_employee: form.pf_employee, pf_employer: form.pf_employer,
          esi_employee: form.esi_employee, esi_employer: form.esi_employer, professional_tax: form.professional_tax,
          tds: form.tds, other_deductions: form.other_deductions, effective_from: form.effective_from,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Salary structure updated" : "Salary structure added");
      queryClient.invalidateQueries({ queryKey: ["salary-structures"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(s: any) {
    setEditId(s.id);
    setForm({
      employee_id: s.employee_id, basic_pay: s.basic_pay, hra: s.hra || 0, da: s.da || 0,
      special_allowance: s.special_allowance || 0, pf_employee: s.pf_employee || 0, pf_employer: s.pf_employer || 0,
      esi_employee: s.esi_employee || 0, esi_employer: s.esi_employer || 0, professional_tax: s.professional_tax || 0,
      tds: s.tds || 0, other_deductions: s.other_deductions || 0, effective_from: s.effective_from,
    });
    setOpen(true);
  }

  const filtered = (structures || []).filter(s => {
    const emp = empMap.get(s.employee_id);
    if (!emp) return false;
    const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const gross = form.basic_pay + form.hra + form.da + form.special_allowance;
  const totalDed = form.pf_employee + form.esi_employee + form.professional_tax + form.tds + form.other_deductions;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Input placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
        <Button size="sm" className="gap-1" onClick={() => { setEditId(null); setForm(emptyForm); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Structure
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Basic</TableHead>
                <TableHead className="text-xs">HRA</TableHead>
                <TableHead className="text-xs">Gross</TableHead>
                <TableHead className="text-xs">PF(E)</TableHead>
                <TableHead className="text-xs">ESI(E)</TableHead>
                <TableHead className="text-xs">PT</TableHead>
                <TableHead className="text-xs">TDS</TableHead>
                <TableHead className="text-xs">Net Est.</TableHead>
                <TableHead className="text-xs w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const emp = empMap.get(s.employee_id);
                const g = Number(s.gross_salary || 0);
                const ded = Number(s.pf_employee || 0) + Number(s.esi_employee || 0) + Number(s.professional_tax || 0) + Number(s.tds || 0) + Number(s.other_deductions || 0);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                    <TableCell className="text-xs">₹{Number(s.basic_pay).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{Number(s.hra || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-medium">₹{g.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{Number(s.pf_employee || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{Number(s.esi_employee || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{Number(s.professional_tax || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{Number(s.tds || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-medium text-green-600">₹{(g - ded).toLocaleString()}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">No salary structures found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Salary Structure</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editId && (
              <div>
                <Label>Employee</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {(employees || []).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {([
                ["basic_pay", "Basic Pay"], ["hra", "HRA"], ["da", "DA"], ["special_allowance", "Special Allowance"],
                ["pf_employee", "PF (Employee)"], ["pf_employer", "PF (Employer)"], ["esi_employee", "ESI (Employee)"], ["esi_employer", "ESI (Employer)"],
                ["professional_tax", "Professional Tax"], ["tds", "TDS"], ["other_deductions", "Other Deductions"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) || 0 }))} />
                </div>
              ))}
              <div>
                <Label className="text-xs">Effective From</Label>
                <Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-4 text-sm pt-2 border-t">
              <span>Gross: <strong>₹{gross.toLocaleString()}</strong></span>
              <span>Deductions: <strong>₹{totalDed.toLocaleString()}</strong></span>
              <span>Net: <strong className="text-green-600">₹{(gross - totalDed).toLocaleString()}</strong></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{editId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
