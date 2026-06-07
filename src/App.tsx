import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Index from "@/pages/Index";
import EmployeeDirectory from "@/pages/employees/EmployeeDirectory";
import EmployeeProfile from "@/pages/employees/EmployeeProfile";
import RosterPage from "@/pages/ops/RosterPage";
import AttendancePage from "@/pages/ops/AttendancePage";
import LeavePage from "@/pages/ops/LeavePage";
import Placeholder from "@/pages/Placeholder";
import DutyBoardPage from "@/pages/ops/DutyBoardPage";
import PayrollPage from "@/pages/ops/PayrollPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import RecruitmentDashboard from "@/pages/recruitment/RecruitmentDashboard";
import RequisitionListPage from "@/pages/recruitment/RequisitionListPage";
import RequisitionDetailPage from "@/pages/recruitment/RequisitionDetailPage";
import CandidateListPage from "@/pages/recruitment/CandidateListPage";
import CandidateProfilePage from "@/pages/recruitment/CandidateProfilePage";
import ProbationTrackerPage from "@/pages/recruitment/ProbationTrackerPage";
import ReviewsPage from "@/pages/growth/ReviewsPage";
import TrainingPage from "@/pages/growth/TrainingPage";
import KpiDashboardPage from "@/pages/intelligence/KpiDashboardPage";
import AlertDashboardPage from "@/pages/alerts/AlertDashboardPage";
import AuditDashboardPage from "@/pages/intelligence/AuditDashboardPage";
import ClinicalDocumentsPage from "@/pages/clinical/ClinicalDocumentsPage";
import ScreeningTemplateListPage from "@/pages/recruitment/ScreeningTemplateListPage";
import ScreeningTemplateBuilderPage from "@/pages/recruitment/ScreeningTemplateBuilderPage";
import OnboardingDashboard from "@/pages/onboarding/OnboardingDashboard";
import OnboardingCaseDetail from "@/pages/onboarding/OnboardingCaseDetail";
import OnboardingTemplates from "@/pages/onboarding/OnboardingTemplates";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/people/employees" element={<EmployeeDirectory />} />
              <Route path="/people/employees/:id" element={<EmployeeProfile />} />
              <Route path="/people/recruitment" element={<RecruitmentDashboard />} />
              <Route path="/people/recruitment/requisitions" element={<RequisitionListPage />} />
              <Route path="/people/recruitment/requisitions/new" element={<RequisitionListPage />} />
              <Route path="/people/recruitment/requisitions/:id" element={<RequisitionDetailPage />} />
              <Route path="/people/recruitment/candidates" element={<CandidateListPage />} />
              <Route path="/people/recruitment/candidates/:id" element={<CandidateProfilePage />} />
              <Route path="/people/recruitment/probation" element={<ProbationTrackerPage />} />
              <Route path="/people/recruitment/screening-templates" element={<ScreeningTemplateListPage />} />
              <Route path="/people/recruitment/screening-templates/:id" element={<ScreeningTemplateBuilderPage />} />
              <Route path="/people/onboarding" element={<OnboardingDashboard />} />
              <Route path="/people/onboarding/:id" element={<OnboardingCaseDetail />} />
              <Route path="/people/onboarding/templates" element={<OnboardingTemplates />} />
              <Route path="/ops/roster" element={<RosterPage />} />
              <Route path="/ops/attendance" element={<AttendancePage />} />
              <Route path="/ops/leave" element={<LeavePage />} />
              <Route path="/ops/duty-board" element={<DutyBoardPage />} />
              <Route path="/ops/payroll" element={<PayrollPage />} />
              <Route path="/growth/training" element={<TrainingPage />} />
              <Route path="/growth/reviews" element={<ReviewsPage />} />
              <Route path="/growth/incidents" element={<Placeholder />} />
              <Route path="/intelligence/kpis" element={<KpiDashboardPage />} />
              <Route path="/intelligence/audit" element={<AuditDashboardPage />} />
              <Route path="/alerts" element={<AlertDashboardPage />} />
              <Route path="/clinical/documents" element={<ClinicalDocumentsPage />} />
              <Route path="/comms/announcements" element={<Placeholder />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
