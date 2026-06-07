import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowNum: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
  resolved: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    employee_code?: string;
    gender?: string;
    date_of_joining?: string;
    department_id?: string;
    designation_id?: string;
    branch_id?: string;
    program_id?: string;
  };
}

const TEMPLATE_COLS = [
  "first_name", "last_name", "email", "phone", "employee_code",
  "gender", "date_of_joining", "department", "designation", "branch", "program",
];

const SAMPLE_ROW = {
  first_name: "Priya", last_name: "Sharma", email: "priya@example.com",
  phone: "9876543210", employee_code: "EMP001", gender: "female",
  date_of_joining: "2025-01-15", department: "Nursing", designation: "Staff Nurse",
  branch: "Main Center", program: "",
};

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments-lookup"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("departments").select("id, name"); return data || []; },
  });
  const { data: designations } = useQuery({
    queryKey: ["designations-lookup"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("designations").select("id, title"); return data || []; },
  });
  const { data: branches } = useQuery({
    queryKey: ["branches-lookup"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name"); return data || []; },
  });
  const { data: programs } = useQuery({
    queryKey: ["programs-lookup"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("programs").select("id, name"); return data || []; },
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([SAMPLE_ROW], { header: TEMPLATE_COLS });
    XLSX.utils.sheet_add_aoa(ws, [TEMPLATE_COLS.map(c => c === "first_name" ? "first_name*" : c === "last_name" ? "last_name*" : c)], { origin: "A1" });
    ws["!cols"] = TEMPLATE_COLS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");

    // Add reference sheets
    if (departments?.length) {
      const ds = XLSX.utils.json_to_sheet(departments.map(d => ({ name: d.name })));
      XLSX.utils.book_append_sheet(wb, ds, "Departments (Ref)");
    }
    if (designations?.length) {
      const ds = XLSX.utils.json_to_sheet(designations.map(d => ({ title: d.title })));
      XLSX.utils.book_append_sheet(wb, ds, "Designations (Ref)");
    }
    if (branches?.length) {
      const bs = XLSX.utils.json_to_sheet(branches.map(b => ({ name: b.name })));
      XLSX.utils.book_append_sheet(wb, bs, "Branches (Ref)");
    }

    XLSX.writeFile(wb, "employee_upload_template.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      const parsed = jsonRows.map((raw, i) => parseRow(raw, i + 2));
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const parseRow = (raw: Record<string, string>, rowNum: number): ParsedRow => {
    const norm: Record<string, string> = {};
    Object.entries(raw).forEach(([k, v]) => {
      norm[k.replace("*", "").trim().toLowerCase()] = String(v).trim();
    });

    const errors: string[] = [];
    if (!norm.first_name) errors.push("first_name required");
    if (!norm.last_name) errors.push("last_name required");

    if (norm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm.email)) errors.push("Invalid email");
    if (norm.gender && !["male", "female", "other"].includes(norm.gender.toLowerCase())) errors.push("Gender must be male/female/other");
    if (norm.date_of_joining && !/^\d{4}-\d{2}-\d{2}$/.test(norm.date_of_joining)) errors.push("Date format: YYYY-MM-DD");

    const deptId = norm.department ? departments?.find(d => d.name.toLowerCase() === norm.department.toLowerCase())?.id : undefined;
    if (norm.department && !deptId) errors.push(`Dept "${norm.department}" not found`);

    const desigId = norm.designation ? designations?.find(d => d.title.toLowerCase() === norm.designation.toLowerCase())?.id : undefined;
    if (norm.designation && !desigId) errors.push(`Designation "${norm.designation}" not found`);

    const branchId = norm.branch ? branches?.find(b => b.name.toLowerCase() === norm.branch.toLowerCase())?.id : undefined;
    if (norm.branch && !branchId) errors.push(`Branch "${norm.branch}" not found`);

    const progId = norm.program ? programs?.find(p => p.name.toLowerCase() === norm.program.toLowerCase())?.id : undefined;
    if (norm.program && !progId) errors.push(`Program "${norm.program}" not found`);

    return {
      rowNum, data: norm, valid: errors.length === 0, errors,
      resolved: {
        first_name: norm.first_name || "",
        last_name: norm.last_name || "",
        email: norm.email || undefined,
        phone: norm.phone || undefined,
        employee_code: norm.employee_code || undefined,
        gender: norm.gender?.toLowerCase() || undefined,
        date_of_joining: norm.date_of_joining || undefined,
        department_id: deptId,
        designation_id: desigId,
        branch_id: branchId,
        program_id: progId,
      },
    };
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    let imported = 0;
    try {
      const CHUNK = 50;
      for (let i = 0; i < validRows.length; i += CHUNK) {
        const chunk = validRows.slice(i, i + CHUNK).map(r => r.resolved);
        const { error } = await supabase.from("employees").insert(chunk as any);
        if (error) throw error;
        imported += chunk.length;
      }
      toast({ title: "Import complete", description: `${imported} employee(s) added successfully.` });
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setStep("upload");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Bulk Upload Employees
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to import multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center space-y-3">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Drop your file here or click to browse</p>
                <p className="text-sm text-muted-foreground">Supports .xlsx and .csv files</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                Choose File
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">
                  Download our pre-formatted template with reference data for departments, designations & branches.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={downloadTemplate} className="gap-1 shrink-0">
                <Download className="h-3.5 w-3.5" /> Download Template
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Column guide:</p>
              <p><strong>Required:</strong> first_name, last_name</p>
              <p><strong>Optional:</strong> email, phone, employee_code, gender (male/female/other), date_of_joining (YYYY-MM-DD), department, designation, branch, program</p>
              <p>Department, designation, branch & program columns should use <strong>exact names</strong> from your system settings.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> {validRows.length} valid
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> {invalidRows.length} errors
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">({rows.length} total rows)</span>
            </div>
            <ScrollArea className="h-[350px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Details / Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNum} className={r.valid ? "" : "bg-destructive/5"}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNum}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {r.data.first_name} {r.data.last_name}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.email || "—"}</TableCell>
                      <TableCell className="text-sm">{r.data.department || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.valid ? (
                          <span className="text-muted-foreground">Ready to import</span>
                        ) : (
                          <span className="text-destructive">{r.errors.join("; ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); }}>
              Upload Different File
            </Button>
          )}
          {step === "preview" && validRows.length > 0 && (
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {validRows.length} Employee{validRows.length > 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
