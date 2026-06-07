import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, GraduationCap, Award, BookOpen, ShieldCheck } from "lucide-react";

const CATEGORIES = ["clinical", "safety", "compliance", "soft_skills", "technical"];
const CERT_LEVELS = ["L1", "L2", "L3"];

const LEVEL_COLORS: Record<string, string> = {
  L1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  L2: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  L3: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const STATUS_COLORS: Record<string, string> = {
  enrolled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function TrainingPage() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("super_admin") || roles.includes("hr_manager");
  const queryClient = useQueryClient();
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "", code: "", description: "", category: "clinical",
    duration_hours: "1", certification_level: "L1", is_mandatory: false,
  });
  const [newCert, setNewCert] = useState({
    employee_id: "", certification_name: "", certification_level: "L1",
    certified_date: "", expiry_date: "", issued_by: "",
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["training_courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_courses").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["training_enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_enrollments")
        .select("*, training_courses(name, code), employees(first_name, last_name)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: certifications } = useQuery({
    queryKey: ["staff_certifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_certifications")
        .select("*, employees(first_name, last_name)")
        .order("certified_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, first_name, last_name").eq("status", "active");
      return data || [];
    },
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("training_courses").insert({
        name: newCourse.name,
        code: newCourse.code,
        description: newCourse.description || null,
        category: newCourse.category,
        duration_hours: parseInt(newCourse.duration_hours) || 1,
        certification_level: newCourse.certification_level,
        is_mandatory: newCourse.is_mandatory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_courses"] });
      setCourseDialogOpen(false);
      setNewCourse({ name: "", code: "", description: "", category: "clinical", duration_hours: "1", certification_level: "L1", is_mandatory: false });
      toast.success("Course created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrollEmployee = useMutation({
    mutationFn: async ({ courseId, employeeId }: { courseId: string; employeeId: string }) => {
      const { error } = await supabase.from("training_enrollments").insert({
        course_id: courseId,
        employee_id: employeeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_enrollments"] });
      toast.success("Employee enrolled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEnrollmentStatus = useMutation({
    mutationFn: async ({ id, status, score }: { id: string; status: string; score?: number }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (score !== undefined) updates.score = score;
      const { error } = await supabase.from("training_enrollments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_enrollments"] });
      toast.success("Enrollment updated");
    },
  });

  const createCertification = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_certifications").insert({
        employee_id: newCert.employee_id,
        certification_name: newCert.certification_name,
        certification_level: newCert.certification_level,
        certified_date: newCert.certified_date,
        expiry_date: newCert.expiry_date || null,
        issued_by: newCert.issued_by || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_certifications"] });
      setCertDialogOpen(false);
      setNewCert({ employee_id: "", certification_name: "", certification_level: "L1", certified_date: "", expiry_date: "", issued_by: "" });
      toast.success("Certification added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completedCount = enrollments?.filter((e) => e.status === "completed").length || 0;
  const totalEnrollments = enrollments?.length || 0;
  const completionRate = totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : 0;
  const activeCerts = certifications?.filter((c) => c.status === "active").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Academy</h1>
          <p className="text-sm text-muted-foreground">Manage courses, enrollments, and staff certifications.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{courses?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalEnrollments}</p>
                <p className="text-xs text-muted-foreground">Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
            <Progress value={completionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Award className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{activeCerts}</p>
                <p className="text-xs text-muted-foreground">Active Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Courses</TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Enrollments</TabsTrigger>
          <TabsTrigger value="certifications" className="gap-1.5"><Award className="h-3.5 w-3.5" />Certifications</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Course Catalog</CardTitle>
              {isAdmin && (
                <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Add Course</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Training Course</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Code</label>
                          <Input value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} placeholder="e.g. CL-001" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <Select value={newCourse.category} onValueChange={(v) => setNewCourse({ ...newCourse, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Level</label>
                          <Select value={newCourse.certification_level} onValueChange={(v) => setNewCourse({ ...newCourse, certification_level: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CERT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Hours</label>
                          <Input type="number" value={newCourse.duration_hours} onChange={(e) => setNewCourse({ ...newCourse, duration_hours: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={newCourse.is_mandatory} onCheckedChange={(v) => setNewCourse({ ...newCourse, is_mandatory: v })} />
                        <label className="text-sm">Mandatory course</label>
                      </div>
                      <Button onClick={() => createCourse.mutate()} disabled={!newCourse.name || !newCourse.code} className="w-full">Create Course</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {coursesLoading ? <p className="text-muted-foreground text-center py-4">Loading...</p> : courses?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No courses yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Mandatory</TableHead>
                      {isAdmin && <TableHead>Enroll</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses?.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{course.name}</p>
                            <p className="text-xs text-muted-foreground">{course.code}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{course.category.replace("_", " ")}</Badge></TableCell>
                        <TableCell><Badge className={LEVEL_COLORS[course.certification_level] || ""}>{course.certification_level}</Badge></TableCell>
                        <TableCell className="text-sm">{course.duration_hours}h</TableCell>
                        <TableCell>{course.is_mandatory ? <Badge variant="destructive" className="text-xs">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Select onValueChange={(empId) => enrollEmployee.mutate({ courseId: course.id, employeeId: empId })}>
                              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Enroll..." /></SelectTrigger>
                              <SelectContent>
                                {employees?.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments">
          <Card>
            <CardHeader><CardTitle className="text-base">Enrollments</CardTitle></CardHeader>
            <CardContent>
              {enrollments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No enrollments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments?.map((enrollment) => {
                      const emp = enrollment.employees as { first_name: string; last_name: string } | null;
                      const course = enrollment.training_courses as { name: string; code: string } | null;
                      return (
                        <TableRow key={enrollment.id}>
                          <TableCell className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                          <TableCell className="text-sm">{course?.name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(enrollment.enrolled_at), "PP")}</TableCell>
                          <TableCell><Badge className={STATUS_COLORS[enrollment.status] || ""}>{enrollment.status}</Badge></TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                {enrollment.status === "enrolled" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateEnrollmentStatus.mutate({ id: enrollment.id, status: "in_progress" })}>Start</Button>
                                )}
                                {enrollment.status === "in_progress" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateEnrollmentStatus.mutate({ id: enrollment.id, status: "completed", score: 100 })}>Complete</Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Staff Certifications</CardTitle>
              {isAdmin && (
                <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Add Certification</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Staff Certification</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-sm font-medium">Employee</label>
                        <Select value={newCert.employee_id} onValueChange={(v) => setNewCert({ ...newCert, employee_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>
                            {employees?.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Certification Name</label>
                        <Input value={newCert.certification_name} onChange={(e) => setNewCert({ ...newCert, certification_name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Level</label>
                          <Select value={newCert.certification_level} onValueChange={(v) => setNewCert({ ...newCert, certification_level: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CERT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l} — {l === "L1" ? "Basic" : l === "L2" ? "Independent" : "Program Leader"}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Issued By</label>
                          <Input value={newCert.issued_by} onChange={(e) => setNewCert({ ...newCert, issued_by: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Certified Date</label>
                          <Input type="date" value={newCert.certified_date} onChange={(e) => setNewCert({ ...newCert, certified_date: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Expiry Date</label>
                          <Input type="date" value={newCert.expiry_date} onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })} />
                        </div>
                      </div>
                      <Button onClick={() => createCertification.mutate()} disabled={!newCert.employee_id || !newCert.certification_name || !newCert.certified_date} className="w-full">Add Certification</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {certifications?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No certifications recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications?.map((cert) => {
                      const emp = cert.employees as { first_name: string; last_name: string } | null;
                      return (
                        <TableRow key={cert.id}>
                          <TableCell className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{cert.certification_name}</p>
                              {cert.issued_by && <p className="text-xs text-muted-foreground">{cert.issued_by}</p>}
                            </div>
                          </TableCell>
                          <TableCell><Badge className={LEVEL_COLORS[cert.certification_level] || ""}>{cert.certification_level}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(cert.certified_date), "PP")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cert.expiry_date ? format(new Date(cert.expiry_date), "PP") : "—"}</TableCell>
                          <TableCell><Badge className={STATUS_COLORS[cert.status] || ""}>{cert.status}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
