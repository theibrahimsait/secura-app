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

  constructor() {
    this.client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  // Get the session token from localStorage
  private getSessionToken(): string | null {
    try {
      const clientData = localStorage.getItem('client_data');
      if (clientData) {
        const parsed = JSON.parse(clientData);
        console.log('Client session token retrieved:', parsed.session_token ? 'Present' : 'Missing');
        return parsed.session_token || null;
      }
    } catch (error) {
      console.error('Error parsing client data:', error);
    }
    console.log('No client data found in localStorage');
    return null;
  }

  // Create a client with session token in headers
  private getAuthenticatedClient(): SupabaseClient<Database> {
    const sessionToken = this.getSessionToken();
    
    if (sessionToken) {
      // Create a new client instance with the session token in headers
      return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            'x-client-session': sessionToken
          }
        }
      });
    }
    
    return this.client;
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

  // Method to manually refresh the client with new session
  refreshAuth() {
    // This will get the updated session token on next request
    return this.getAuthenticatedClient();
  }
}

// Export singleton instance
export const clientSupabase = new ClientSupabaseClient();

// Also export regular supabase for non-authenticated requests
export { supabase } from '@/integrations/supabase/client';