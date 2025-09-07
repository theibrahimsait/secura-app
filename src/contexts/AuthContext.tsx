import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: string | null;
  phone: string | null;
  is_active: boolean;
  onboarding_status: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAgencyAdmin: boolean;
  isAgent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (user: User) => {
    try {
      console.log('🔍 Fetching user profile for auth_user_id:', user.id);
      console.log('📧 User email:', user.email);
      
      // Use the secure function that binds to JWT auth for auth/linking
      const { data, error } = await supabase.rpc('get_user_profile_for_auth');

      console.log('📊 RPC Response:', { data, error });

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      if (data && data.length > 0) {
        const profile = data[0];
        console.log('✅ User profile found:', profile);
        
        // If the user is a client, fetch onboarding_status
        if (profile.role === 'client') {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('onboarding_status')
            .eq('id', profile.id)
            .maybeSingle();
          if (!clientError && clientData) {
            return { ...profile, onboarding_status: clientData.onboarding_status };
          }
        }
        // For non-client users, add null onboarding_status
        return { ...profile, onboarding_status: null };
      }

      console.log('⚠️ User profile not found in database');
      return null;
    } catch (error) {
      console.error('💥 Error in fetchUserProfile:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error: error.message };
      }

      console.log('Sign in successful:', data);
      return {};
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const handleAuthStateChange = async (session: Session | null) => {
    console.log('Auth state change:', session ? 'session exists' : 'no session');
    
    if (session?.user) {
      console.log('Processing session for user:', session.user.email);
      setUser(session.user);
      setSession(session);
      
      // Use setTimeout to prevent blocking the auth state change
      setTimeout(async () => {
        try {
          const profile = await fetchUserProfile(session.user);
          setUserProfile(profile);
          
          if (!profile) {
            console.log('No user profile found after login/session check.');
            toast({
              title: "Access Denied",
              description: "Your account is not authorized to access this system. Please contact support.",
              variant: "destructive",
            });
          } else {
            console.log('User profile loaded successfully:', profile.role);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          toast({
            title: "Error",
            description: "Failed to load user profile. Please try again.",
            variant: "destructive",
          });
        }
        setLoading(false);
      }, 0);
    } else {
      console.log('No session, clearing user state');
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Setting up auth listeners...');
    
    let mounted = true;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'found' : 'not found');
      if (mounted) {
        handleAuthStateChange(session);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (mounted) {
        await handleAuthStateChange(session);
      }
    });

    // Set a fallback timeout to ensure loading doesn't get stuck
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('Auth loading timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      console.log('Cleaning up auth listeners');
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const signOut = async () => {
    try {
      // Log audit event before signing out
      if (userProfile) {
        try {
          await supabase.rpc('log_audit_event', {
            p_user_id: userProfile.id,
            p_client_id: null,
            p_action: 'logout',
            p_resource_type: 'auth',
            p_resource_id: userProfile.id,
          });
        } catch (auditError) {
          console.error('Error logging audit event:', auditError);
          // Don't prevent logout if audit logging fails
        }
      }

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!session && !!userProfile,
    isSuperAdmin: userProfile?.role === 'superadmin',
    isAgencyAdmin: userProfile?.role === 'agency_admin',
    isAgent: userProfile?.role === 'agent',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
