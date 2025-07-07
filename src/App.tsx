
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AgencyDashboard from "./pages/AgencyDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import ClientLogin from "./pages/ClientLogin";
import ClientOnboarding from "./pages/ClientOnboarding";
import ClientDashboard from "./pages/ClientDashboard";
import ClientSettings from "./pages/ClientSettings";
import AddProperty from "./pages/AddProperty";
import Support from "./pages/Support";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Client Routes */}
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/onboarding" element={<ClientOnboarding />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            
            <Route path="/client/settings" element={<ClientSettings />} />
            
            {/* Superadmin Routes (Isolated) */}
            <Route path="/control-panel" element={<SuperAdminLogin />} />
            <Route 
              path="/superadmin/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Agency Routes */}
            <Route 
              path="/agency/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['agency_admin']}>
                  <AgencyDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Agent Routes */}
            <Route 
              path="/agent/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['agent']}>
                  <AgentDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
