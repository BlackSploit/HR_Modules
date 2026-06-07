import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface Props<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  loading: boolean;
  formContent: (item: T | null, onChange: (item: T) => void) => React.ReactNode;
  emptyItem: T;
  onSave: (item: T, isNew: boolean) => Promise<void>;
  onDelete?: (item: T) => Promise<void>;
  getId: (item: T) => string;
}

export function SettingsCrudTable<T extends Record<string, any>>({
  title, data, columns, loading, formContent, emptyItem, onSave, onDelete, getId,
}: Props<T>) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [formItem, setFormItem] = useState<T>(emptyItem);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditItem(null); setFormItem({ ...emptyItem }); setDialogOpen(true); };
  const openEdit = (item: T) => { setEditItem(item); setFormItem({ ...item }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formItem, !editItem);
      setDialogOpen(false);
      toast({ title: editItem ? "Updated successfully" : "Created successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (item: T) => {
    if (!onDelete || !confirm("Are you sure you want to delete this?")) return;
    try {
      await onDelete(item);
      toast({ title: "Deleted successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Add
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No items yet. Click Add to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(item => (
                  <TableRow key={getId(item)}>
                    {columns.map(c => (
                      <TableCell key={c.key}>
                        {c.render ? c.render(item) : (
                          c.key === "is_active" ? (
                            <Badge variant={item[c.key] ? "default" : "secondary"}>{item[c.key] ? "Active" : "Inactive"}</Badge>
                          ) : String(item[c.key] ?? "—")
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {onDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "Add"} {title.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formContent(editItem, (updated) => setFormItem(updated))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
