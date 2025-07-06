import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Supabase URL or Anonymous Key is missing. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your Vercel environment variables."
  );
}

// Create a custom client for authenticated client requests
class ClientSupabaseClient {
  private client: SupabaseClient<Database>;
  private authenticatedClient: SupabaseClient<Database> | null = null;
  private currentSessionToken: string | null = null;

  constructor() {
    this.client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  // Get the session token from localStorage
  private getSessionToken(): string | null {
    try {
      const clientData = localStorage.getItem('client_data');
      console.log('🔍 Client data from localStorage:', clientData);
      
      if (clientData) {
        const parsed = JSON.parse(clientData);
        const sessionToken = parsed.session_token || null;
        console.log('🎯 Extracted session token:', sessionToken ? sessionToken.substring(0, 8) + '...' : 'NULL');
        return sessionToken;
      } else {
        console.log('⚠️ No client_data found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error parsing client data:', error);
    }
    return null;
  }

  // Get or create authenticated client (cached per session token)
  private getAuthenticatedClient(): SupabaseClient<Database> {
    const sessionToken = this.getSessionToken();
    
    // If no session token, return base client
    if (!sessionToken) {
      return this.client;
    }
    
    // If session token changed, recreate authenticated client
    if (sessionToken !== this.currentSessionToken) {
      console.log('🔄 Creating new authenticated client for session:', sessionToken.substring(0, 8) + '...');
      console.log('📋 Headers being set:', { 'x-client-session': sessionToken });
      this.currentSessionToken = sessionToken;
      this.authenticatedClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'x-client-session': sessionToken,
            'Prefer': `custom.client_session=${sessionToken}`
          }
        }
      });
      
      // Note: We don't use auth.setSession() because our session_token is not a JWT
      // Instead, we rely on the x-client-session header for authentication
      
      console.log('✅ Authenticated client created successfully');
    }
    
    return this.authenticatedClient || this.client;
  }

  // Expose the from method with authentication
  from<T extends keyof Database['public']['Tables']>(relation: T) {
    return this.getAuthenticatedClient().from(relation);
  }

  // Expose other commonly used methods
  get auth() {
    return this.client.auth;
  }

  get functions() {
    return this.client.functions;
  }

  get storage() {
    return this.client.storage;
  }

  get realtime() {
    return this.client.realtime;
  }

  // Expose the rpc method
  rpc(fn: any, args?: Record<string, any>, options?: any) {
    return this.getAuthenticatedClient().rpc(fn, args, options);
  }

  // Method to manually refresh the client with new session
  refreshAuth() {
    // Clear cached client to force recreation with new token
    this.authenticatedClient = null;
    this.currentSessionToken = null;
    return this.getAuthenticatedClient();
  }
}

// Export singleton instance
export const clientSupabase = new ClientSupabaseClient();

// Also export regular supabase for non-authenticated requests
export { supabase } from '@/integrations/supabase/client';