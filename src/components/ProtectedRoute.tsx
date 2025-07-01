import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

// Add helper to check onboarding completion
function isOnboardingComplete(onboarding_status: any): boolean {
  if (!onboarding_status) return false;
  try {
    const status = typeof onboarding_status === 'string' ? JSON.parse(onboarding_status) : onboarding_status;
    return status.intro_complete && status.tos_accepted && status.profile_set && status.docs_uploaded;
  } catch {
    return false;
  }
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}) => {
  const { isAuthenticated, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secura-teal"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Onboarding gating for clients
  if (userProfile && userProfile.role === 'client' && !isOnboardingComplete(userProfile.onboarding_status)) {
    if (location.pathname !== '/client/onboarding') {
      return <Navigate to="/client/onboarding" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
