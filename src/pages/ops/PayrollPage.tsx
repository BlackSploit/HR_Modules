import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayrollDashboardTab } from "@/components/payroll/PayrollDashboardTab";
import { SalaryStructuresTab } from "@/components/payroll/SalaryStructuresTab";
import { RunPayrollTab } from "@/components/payroll/RunPayrollTab";
import { PayslipsTab } from "@/components/payroll/PayslipsTab";
import { PayrollHistoryTab } from "@/components/payroll/PayrollHistoryTab";
import { PayrollReportsTab } from "@/components/payroll/PayrollReportsTab";
import { PayrollExceptionsTab } from "@/components/payroll/PayrollExceptionsTab";
import { PayrollAdjustmentsTab } from "@/components/payroll/PayrollAdjustmentsTab";

export default function PayrollPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
        <p className="text-sm text-muted-foreground">Process payroll, manage salary structures, and generate payslips</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="salary">Salary Structures</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="run">Run Payroll</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><PayrollDashboardTab /></TabsContent>
        <TabsContent value="salary"><SalaryStructuresTab /></TabsContent>
        <TabsContent value="adjustments"><PayrollAdjustmentsTab /></TabsContent>
        <TabsContent value="run"><RunPayrollTab /></TabsContent>
        <TabsContent value="exceptions"><PayrollExceptionsTab /></TabsContent>
        <TabsContent value="payslips"><PayslipsTab /></TabsContent>
        <TabsContent value="history"><PayrollHistoryTab /></TabsContent>
        <TabsContent value="reports"><PayrollReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
