
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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      // Log audit event
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          await supabase.rpc('log_audit_event', {
            p_user_id: profile.id,
            p_client_id: null,
            p_action: 'login',
            p_resource_type: 'auth',
            p_resource_id: profile.id,
          });
        }
      }

      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  useEffect(() => {
    const getSessionAndProfile = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const session = data?.session;

        const profile = await fetchUserProfile(session.user.id);

        setSession(session);
        setUser(session?.user ?? null);
        setUserProfile(profile);

        if (Object.keys(session).length === 0 || Object.keys(profile).length === 0) {
          console.log("logout");
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error('Error in useEffect:', err);
      } finally {
        setLoading(false);
      }
    };

    getSessionAndProfile();
  }, [])

  const signOut = async () => {
    try {
      // Log audit event before signing out
      if (userProfile) {
        await supabase.rpc('log_audit_event', {
          p_user_id: userProfile.id,
          p_client_id: null,
          p_action: 'logout',
          p_resource_type: 'auth',
          p_resource_id: userProfile.id,
        });
      }

      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // useEffect(() => {
  //   // Set up auth state listener
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(
  //     async (event, session) => {
  //       setSession(session);
  //       setUser(session?.user ?? null);

  //       if (session?.user) {
  //         const profile = await fetchUserProfile(session.user.id);
  //         setUserProfile(profile);

  //         if (!profile) {
  //           toast({
  //             title: "Access Denied",
  //             description: "Your account is not authorized to access this system.",
  //             variant: "destructive",
  //           });
  //           // await supabase.auth.signOut();
  //         }
  //       } else {
  //         setUserProfile(null);
  //       }

  //       setLoading(false);
  //     }
  //   );

  //   return () => subscription.unsubscribe();
  // }, [toast]);

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
