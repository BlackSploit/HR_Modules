import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, PenLine, CheckCircle2, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClinicalDocumentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("documents");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: templates } = useQuery({
    queryKey: ["clinical_doc_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinical_document_templates").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["clinical_documents", filterType],
    queryFn: async () => {
      let query = supabase.from("clinical_documents").select("*, clinical_document_templates(name, type)").order("created_at", { ascending: false });
      if (filterType !== "all") {
        const templateIds = templates?.filter(t => t.type === filterType).map(t => t.id) || [];
        if (templateIds.length > 0) query = query.in("template_id", templateIds);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!templates,
  });

  const filteredDocs = documents?.filter(d => {
    if (!searchTerm) return true;
    const tmpl = d.clinical_document_templates as any;
    return tmpl?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.patient_reference?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const signDocument = async (docId: string) => {
    const { error } = await supabase.from("clinical_documents").update({
      status: "signed",
      signed_by: user?.id,
      signed_at: new Date().toISOString(),
    }).eq("id", docId);
    if (error) { toast.error("Failed to sign"); return; }
    toast.success("Document signed");
    queryClient.invalidateQueries({ queryKey: ["clinical_documents"] });
  };

  const docTypes = [...new Set(templates?.map(t => t.type) || [])];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Documentation</h1>
          <p className="text-sm text-muted-foreground">Incident reports, restraint logs, consent forms & medico-legal records</p>
        </div>
        <CreateDocumentDialog templates={templates || []} userId={user?.id || ""} />
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {templates?.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{t.name}</h3>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{t.description}</p>
              <Badge variant="outline" className="text-[10px]">{t.type.replace(/_/g, " ")}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Document Archive</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 w-[200px]" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {docTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocs?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No documents found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs?.map(doc => {
                    const tmpl = doc.clinical_document_templates as any;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{tmpl?.name || "Document"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{tmpl?.type?.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{doc.patient_reference || "—"}</TableCell>
                        <TableCell>
                          <StatusChip
                            status={doc.status === "signed" ? "verified" : doc.status === "completed" ? "success" : "pending"}
                            label={doc.status}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(doc.created_at), "MMM d, HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <ViewDocumentDialog doc={doc} templateName={tmpl?.name} />
                            {doc.status !== "signed" && (
                              <Button variant="outline" size="sm" onClick={() => signDocument(doc.id)}>
                                <PenLine className="h-3 w-3 mr-1" />Sign
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ViewDocumentDialog({ doc, templateName }: { doc: any; templateName?: string }) {
  const data = doc.data as Record<string, any>;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><FileText className="h-3 w-3 mr-1" />View</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{templateName || "Document"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {doc.patient_reference && (
            <div>
              <Label className="text-xs text-muted-foreground">Patient Reference</Label>
              <p className="text-sm">{doc.patient_reference}</p>
            </div>
          )}
          {Object.entries(data).map(([key, value]) => (
            <div key={key}>
              <Label className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</Label>
              <p className="text-sm">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p>
            </div>
          ))}
          {doc.signed_by && (
            <div className="pt-2 border-t border-border">
              <Badge variant="outline" className="text-success border-success gap-1">
                <CheckCircle2 className="h-3 w-3" />Signed on {format(new Date(doc.signed_at), "MMM d, yyyy HH:mm")}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateDocumentDialog({ templates, userId }: { templates: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [patientRef, setPatientRef] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  const selectedTemplate = templates.find(t => t.id === templateId);
  const fields = selectedTemplate?.fields_schema as any[] || [];

  const handleSubmit = async () => {
    if (!templateId) return;
    // Check required fields
    const missingRequired = fields.filter(f => f.required && !formData[f.name]);
    if (missingRequired.length > 0) {
      toast.error(`Please fill: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    const { error } = await supabase.from("clinical_documents").insert({
      template_id: templateId,
      employee_id: userId,
      patient_reference: patientRef || null,
      data: formData,
      status: "completed",
    });
    if (error) { toast.error("Failed to create document"); return; }
    toast.success("Document created");
    queryClient.invalidateQueries({ queryKey: ["clinical_documents"] });
    setOpen(false);
    setFormData({});
    setPatientRef("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />New Document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Clinical Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setFormData({}); }}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent>
              {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input placeholder="Patient Reference" value={patientRef} onChange={e => setPatientRef(e.target.value)} />

          {fields.map(field => (
            <div key={field.name} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  value={formData[field.name] || ""}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                />
              ) : field.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData[field.name] || false}
                    onCheckedChange={v => setFormData({ ...formData, [field.name]: v })}
                  />
                  <span className="text-sm text-muted-foreground">Confirmed</span>
                </div>
              ) : field.type === "select" ? (
                <Select value={formData[field.name] || ""} onValueChange={v => setFormData({ ...formData, [field.name]: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type === "datetime" ? "datetime-local" : "text"}
                  value={formData[field.name] || ""}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                />
              )}
            </div>
          ))}

          {selectedTemplate && (
            <Button onClick={handleSubmit} className="w-full">Create Document</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
