import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Droplet, AlertTriangle, FileText } from "lucide-react";

const statusMap: Record<string, "active" | "warning" | "overdue" | "pending"> = {
  active: "active",
  probation: "warning",
  suspended: "overdue",
  terminated: "overdue",
  resigned: "pending",
  notice_period: "warning",
};

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(name), designations(title), branches(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ["employee-timeline", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_timeline")
        .select("*")
        .eq("employee_id", id!)
        .order("event_date", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-52 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <EmptyState
        icon={FileText}
        title="Employee not found"
        description="This employee record doesn't exist or you don't have permission to view it."
        actionLabel="Back to Directory"
        onAction={() => navigate("/people/employees")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={() => navigate("/people/employees")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-primary shrink-0">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
                <StatusChip status={statusMap[employee.status] || "pending"} label={employee.status.replace("_", " ")} />
              </div>
              <p className="text-muted-foreground text-sm">{employee.designations?.title || "No designation"} • {employee.departments?.name || "No department"}</p>
              <p className="text-xs text-muted-foreground font-mono">{employee.employee_code || "No code assigned"}</p>
              {/* Quick contact */}
              <div className="flex gap-2 pt-1">
                {employee.phone && (
                  <a href={`tel:${employee.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <Phone className="h-3 w-3" />Call
                  </a>
                )}
                {employee.email && (
                  <a href={`mailto:${employee.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <Mail className="h-3 w-3" />Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Mail, label: "Email", value: employee.email },
              { icon: Phone, label: "Phone", value: employee.phone },
              { icon: MapPin, label: "Address", value: [employee.address, employee.city, employee.state].filter(Boolean).join(", ") },
              { icon: Calendar, label: "Date of Joining", value: employee.date_of_joining },
              { icon: Droplet, label: "Blood Group", value: employee.blood_group },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value || "—"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Contact Name</p>
                <p className="text-sm font-medium">{employee.emergency_contact_name || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Contact Phone</p>
                <p className="text-sm font-medium">{employee.emergency_contact_phone || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline?.length ? (
            <div className="space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="flex gap-3 items-start">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{event.event_title}</p>
                    {event.event_description && <p className="text-xs text-muted-foreground">{event.event_description}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(event.event_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No timeline events"
              description="Employment history events will appear here as they are recorded."
              className="py-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
