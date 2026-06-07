import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Briefcase, Layers, Hospital, Clock } from "lucide-react";
import { BranchesTab } from "@/components/settings/BranchesTab";
import { DepartmentsTab } from "@/components/settings/DepartmentsTab";
import { DesignationsTab } from "@/components/settings/DesignationsTab";
import { ProgramsTab } from "@/components/settings/ProgramsTab";
import { CenterConfigTab } from "@/components/settings/CenterConfigTab";
import { ShiftTemplatesTab } from "@/components/settings/ShiftTemplatesTab";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage organizational structure, programs, and system configuration.</p>
      </div>

      <Tabs defaultValue="branches" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="branches" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Branches</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Departments</TabsTrigger>
          <TabsTrigger value="designations" className="gap-1.5 text-xs"><Briefcase className="h-3.5 w-3.5" />Designations</TabsTrigger>
          <TabsTrigger value="programs" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" />Programs</TabsTrigger>
          <TabsTrigger value="centers" className="gap-1.5 text-xs"><Hospital className="h-3.5 w-3.5" />Centers</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="branches"><BranchesTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="designations"><DesignationsTab /></TabsContent>
        <TabsContent value="programs"><ProgramsTab /></TabsContent>
        <TabsContent value="centers"><CenterConfigTab /></TabsContent>
        <TabsContent value="shifts"><ShiftTemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
