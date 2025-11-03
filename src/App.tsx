import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Finances from "./pages/dashboard/Finances";
import DailyReturns from "./pages/dashboard/DailyReturns";
import RewardsHub from "./pages/dashboard/RewardsHub";
import Analytics from "./pages/dashboard/Analytics";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import HelpCenter from "./pages/dashboard/HelpCenter";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminKYC from "./pages/admin/AdminKYC";
import AdminLogs from "./pages/admin/AdminLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Dashboard Routes with Sidebar Layout */}
          <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
          <Route path="/dashboard/finances" element={<DashboardLayout><Finances /></DashboardLayout>} />
          <Route path="/dashboard/daily-returns" element={<DashboardLayout><DailyReturns /></DashboardLayout>} />
          <Route path="/dashboard/rewards" element={<DashboardLayout><RewardsHub /></DashboardLayout>} />
          <Route path="/dashboard/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
          <Route path="/dashboard/profile" element={<DashboardLayout><ProfileSettings /></DashboardLayout>} />
          <Route path="/dashboard/help" element={<DashboardLayout><HelpCenter /></DashboardLayout>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/deposits" element={<AdminDeposits />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/withdrawals" element={<AdminTransactions />} />
          <Route path="/admin/kyc" element={<AdminKYC />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
