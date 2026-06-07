import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, Shield, Users } from "lucide-react";

export function LeavePolicySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settingsTab, setSettingsTab] = useState("accrual");
  const [showAccrualDialog, setShowAccrualDialog] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showCoverageDialog, setShowCoverageDialog] = useState(false);

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: designations } = useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const { data } = await supabase.from("designations").select("id, title").eq("is_active", true).order("title");
      return data || [];
    },
  });

  // Accrual Rules
  const { data: accrualRules, isLoading: accrualLoading } = useQuery({
    queryKey: ["leave-accrual-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_accrual_rules").select("*, leave_types(name, code)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Policies
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ["leave-policies"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_policies").select("*, leave_types(name, code), departments(name), designations(title)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Coverage Rules
  const { data: coverageRules, isLoading: coverageLoading } = useQuery({
    queryKey: ["leave-coverage-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_coverage_rules").select("*, departments(name), designations:role_designation_id(title)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Accrual form
  const [accrualForm, setAccrualForm] = useState({
    leave_type_id: "", accrual_method: "fixed_annual", posting_frequency: "yearly",
    carry_forward_cap: "0", encashment_allowed: false, max_encashment_days: "0",
    tenure_threshold_months: "0", proration_rule: "proportional",
  });

  const createAccrual = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_accrual_rules").insert({
        leave_type_id: accrualForm.leave_type_id,
        accrual_method: accrualForm.accrual_method,
        posting_frequency: accrualForm.posting_frequency,
        carry_forward_cap: Number(accrualForm.carry_forward_cap),
        encashment_allowed: accrualForm.encashment_allowed,
        max_encashment_days: Number(accrualForm.max_encashment_days),
        tenure_threshold_months: Number(accrualForm.tenure_threshold_months),
        proration_rule: accrualForm.proration_rule,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Accrual rule created" });
      queryClient.invalidateQueries({ queryKey: ["leave-accrual-rules"] });
      setShowAccrualDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Policy form
  const [policyForm, setPolicyForm] = useState({
    leave_type_id: "", name: "", employment_type: "", department_id: "", designation_id: "",
    max_continuous_days: "", notice_days_required: "0", min_tenure_months: "0",
    effective_from: new Date().toISOString().split("T")[0],
  });

  const createPolicy = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_policies").insert({
        leave_type_id: policyForm.leave_type_id,
        name: policyForm.name,
        employment_type: policyForm.employment_type || null,
        department_id: policyForm.department_id || null,
        designation_id: policyForm.designation_id || null,
        max_continuous_days: policyForm.max_continuous_days ? Number(policyForm.max_continuous_days) : null,
        notice_days_required: Number(policyForm.notice_days_required),
        min_tenure_months: Number(policyForm.min_tenure_months),
        effective_from: policyForm.effective_from,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Policy created" });
      queryClient.invalidateQueries({ queryKey: ["leave-policies"] });
      setShowPolicyDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Coverage form
  const [coverageForm, setCoverageForm] = useState({ department_id: "", min_staff_count: "1", role_designation_id: "" });

  const createCoverage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_coverage_rules").insert({
        department_id: coverageForm.department_id || null,
        min_staff_count: Number(coverageForm.min_staff_count),
        role_designation_id: coverageForm.role_designation_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Coverage rule created" });
      queryClient.invalidateQueries({ queryKey: ["leave-coverage-rules"] });
      setShowCoverageDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Tabs value={settingsTab} onValueChange={setSettingsTab}>
        <TabsList>
          <TabsTrigger value="accrual" className="gap-1"><Settings2 className="h-3.5 w-3.5" /> Accrual Rules</TabsTrigger>
          <TabsTrigger value="policies" className="gap-1"><Shield className="h-3.5 w-3.5" /> Policies</TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1"><Users className="h-3.5 w-3.5" /> Coverage Rules</TabsTrigger>
        </TabsList>

        {/* Accrual Rules */}
        <TabsContent value="accrual" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setShowAccrualDialog(true)}><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
          </div>
          {accrualLoading ? <Skeleton className="h-40" /> : !accrualRules?.length ? (
            <Card><CardContent><EmptyState icon={Settings2} title="No accrual rules" description="Configure how leave balances are accrued." /></CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Carry Fwd Cap</TableHead>
                    <TableHead>Encashment</TableHead>
                    <TableHead>Min Tenure</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accrualRules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.leave_types?.name}</TableCell>
                      <TableCell><Badge variant="outline">{r.accrual_method}</Badge></TableCell>
                      <TableCell>{r.posting_frequency}</TableCell>
                      <TableCell>{r.carry_forward_cap} days</TableCell>
                      <TableCell>{r.encashment_allowed ? `Yes (max ${r.max_encashment_days}d)` : "No"}</TableCell>
                      <TableCell>{r.tenure_threshold_months > 0 ? `${r.tenure_threshold_months} months` : "-"}</TableCell>
                      <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setShowPolicyDialog(true)}><Plus className="h-3.5 w-3.5" /> Add Policy</Button>
          </div>
          {policiesLoading ? <Skeleton className="h-40" /> : !policies?.length ? (
            <Card><CardContent><EmptyState icon={Shield} title="No policies" description="Define leave policies by employee group." /></CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Max Continuous</TableHead>
                    <TableHead>Notice Days</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.leave_types?.code}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[p.employment_type, p.departments?.name, p.designations?.title].filter(Boolean).join(", ") || "All"}
                      </TableCell>
                      <TableCell>{p.max_continuous_days ? `${p.max_continuous_days}d` : "-"}</TableCell>
                      <TableCell>{p.notice_days_required > 0 ? `${p.notice_days_required}d` : "-"}</TableCell>
                      <TableCell>{p.effective_from}</TableCell>
                      <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Coverage Rules */}
        <TabsContent value="coverage" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setShowCoverageDialog(true)}><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
          </div>
          {coverageLoading ? <Skeleton className="h-40" /> : !coverageRules?.length ? (
            <Card><CardContent><EmptyState icon={Users} title="No coverage rules" description="Set minimum staffing thresholds." /></CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Min Staff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverageRules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.departments?.name || "All"}</TableCell>
                      <TableCell>{r.designations?.title || "All Roles"}</TableCell>
                      <TableCell>{r.min_staff_count}</TableCell>
                      <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Accrual Dialog */}
      <Dialog open={showAccrualDialog} onOpenChange={setShowAccrualDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Accrual Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Leave Type</Label>
              <Select value={accrualForm.leave_type_id} onValueChange={(v) => setAccrualForm({ ...accrualForm, leave_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{leaveTypes?.map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Method</Label>
                <Select value={accrualForm.accrual_method} onValueChange={(v) => setAccrualForm({ ...accrualForm, accrual_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_annual">Fixed Annual</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="prorated">Prorated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Posting Frequency</Label>
                <Select value={accrualForm.posting_frequency} onValueChange={(v) => setAccrualForm({ ...accrualForm, posting_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Carry Forward Cap (days)</Label>
                <Input type="number" value={accrualForm.carry_forward_cap} onChange={(e) => setAccrualForm({ ...accrualForm, carry_forward_cap: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Min Tenure (months)</Label>
                <Input type="number" value={accrualForm.tenure_threshold_months} onChange={(e) => setAccrualForm({ ...accrualForm, tenure_threshold_months: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={accrualForm.encashment_allowed} onCheckedChange={(v) => setAccrualForm({ ...accrualForm, encashment_allowed: v })} />
              <Label>Encashment Allowed</Label>
            </div>
            {accrualForm.encashment_allowed && (
              <div className="space-y-1">
                <Label>Max Encashment Days</Label>
                <Input type="number" value={accrualForm.max_encashment_days} onChange={(e) => setAccrualForm({ ...accrualForm, max_encashment_days: e.target.value })} />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAccrualDialog(false)}>Cancel</Button>
              <Button onClick={() => createAccrual.mutate()} disabled={!accrualForm.leave_type_id || createAccrual.isPending}>
                {createAccrual.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Leave Policy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Policy Name</Label>
                <Input value={policyForm.name} onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Leave Type</Label>
                <Select value={policyForm.leave_type_id} onValueChange={(v) => setPolicyForm({ ...policyForm, leave_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{leaveTypes?.map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Employment Type</Label>
                <Select value={policyForm.employment_type} onValueChange={(v) => setPolicyForm({ ...policyForm, employment_type: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="trainee">Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={policyForm.department_id} onValueChange={(v) => setPolicyForm({ ...policyForm, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Max Continuous Days</Label>
                <Input type="number" value={policyForm.max_continuous_days} onChange={(e) => setPolicyForm({ ...policyForm, max_continuous_days: e.target.value })} placeholder="No limit" />
              </div>
              <div className="space-y-1">
                <Label>Notice Days</Label>
                <Input type="number" value={policyForm.notice_days_required} onChange={(e) => setPolicyForm({ ...policyForm, notice_days_required: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Min Tenure (mo)</Label>
                <Input type="number" value={policyForm.min_tenure_months} onChange={(e) => setPolicyForm({ ...policyForm, min_tenure_months: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Effective From</Label>
              <Input type="date" value={policyForm.effective_from} onChange={(e) => setPolicyForm({ ...policyForm, effective_from: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPolicyDialog(false)}>Cancel</Button>
              <Button onClick={() => createPolicy.mutate()} disabled={!policyForm.name || !policyForm.leave_type_id || createPolicy.isPending}>
                {createPolicy.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coverage Dialog */}
      <Dialog open={showCoverageDialog} onOpenChange={setShowCoverageDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Coverage Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={coverageForm.department_id} onValueChange={(v) => setCoverageForm({ ...coverageForm, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                <SelectContent>{departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Role (optional)</Label>
              <Select value={coverageForm.role_designation_id} onValueChange={(v) => setCoverageForm({ ...coverageForm, role_designation_id: v })}>
                <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
                <SelectContent>{designations?.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Minimum Staff Count</Label>
              <Input type="number" min="1" value={coverageForm.min_staff_count} onChange={(e) => setCoverageForm({ ...coverageForm, min_staff_count: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCoverageDialog(false)}>Cancel</Button>
              <Button onClick={() => createCoverage.mutate()} disabled={createCoverage.isPending}>
                {createCoverage.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
