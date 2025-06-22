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

  const fetchUserProfile = async (user: User) => {
    try {
      console.log('Fetching user profile for auth_user_id:', user.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        toast({ title: "Error", description: "Could not fetch user profile.", variant: "destructive" });
        return null;
      }

      if (data) {
        console.log('Found user profile:', data);
        return data;
      }

      if (user.email) {
        console.log('No profile found by auth_user_id, trying by email:', user.email);
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (emailError) {
          console.error('Error fetching user profile by email:', emailError);
          return null;
        }

        if (emailData) {
          console.log('Found user by email, updating auth_user_id...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ auth_user_id: user.id })
            .eq('id', emailData.id);

          if (updateError) {
            console.error('Error updating auth_user_id:', updateError);
          }
          return emailData;
        }
      }

      console.log('No user profile found for user:', user.id);
      return null;
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error);
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

      // The auth state change will handle profile fetching
      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      setLoading(true);

      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        
        setSession(session);
        setUser(session.user);
        setUserProfile(profile);

        if (!profile) {
          console.log("No profile found, signing out.");
          await supabase.auth.signOut();
        }
      } else {
        setSession(null);
        setUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
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
      setUser(null);
      setSession(null);
      setUserProfile(null);
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
