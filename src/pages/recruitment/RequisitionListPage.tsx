import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NewRequisitionDialog from "@/components/recruitment/NewRequisitionDialog";

const statusColors: Record<string, string> = {
  draft: "secondary", pending_approval: "outline", approved: "default",
  sourcing: "default", on_hold: "secondary", filled: "default", cancelled: "destructive",
};

export default function RequisitionListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ["job_requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_requisitions")
        .select("*, departments(name), designations(title), branches(name), programs(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = requisitions.filter((r: any) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "—";
    if (min && max) return `₹${(min/1000).toFixed(0)}k – ₹${(max/1000).toFixed(0)}k`;
    if (min) return `₹${(min/1000).toFixed(0)}k+`;
    return `Up to ₹${(max!/1000).toFixed(0)}k`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people/recruitment")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Job Requisitions</h1>
          <p className="text-sm text-muted-foreground">Create and manage vacancy requests</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Requisition</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requisitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["draft","pending_approval","approved","sourcing","on_hold","filled","cancelled"].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No requisitions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Headcount</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/people/recruitment/requisitions/${r.id}`)}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.departments?.name || "—"}</TableCell>
                    <TableCell>{r.programs?.name || "—"}</TableCell>
                    <TableCell>{r.headcount}</TableCell>
                    <TableCell>{formatBudget(r.budget_min, r.budget_max)}</TableCell>
                    <TableCell>
                      <Badge variant={r.urgency === "critical" ? "destructive" : r.urgency === "urgent" ? "default" : "secondary"} className="capitalize">
                        {r.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(statusColors[r.status] as any) || "secondary"} className="capitalize">
                        {r.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewRequisitionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
