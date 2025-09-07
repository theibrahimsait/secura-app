import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://yugzvvgctlhfcdmmwaxj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Z3p2dmdjdGxoZmNkbW13YXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Nzg0MjUsImV4cCI6MjA2NjE1NDQyNX0.VFiQYl32DVznDs0vEei6Ez7F_9OjAn74NdrAM1WQaG4';

// Create a custom client for authenticated client requests
class ClientSupabaseClient {
  private client: SupabaseClient<Database>;
  private authenticatedClient: SupabaseClient<Database> | null = null;
  private currentSessionToken: string | null = null;

  constructor() {
    this.client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  // Get the session token from localStorage (public method)
  getSessionToken(): string | null {
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
    const sessionToken = this.getSessionToken();
    
    if (!sessionToken) {
      return this.client.storage;
    }
    
    // Create a wrapper that adds custom headers to storage requests
    const originalStorage = this.client.storage;
    const storageWrapper = {
      from: (bucketName: string) => {
        const bucket = originalStorage.from(bucketName);
        
        // Override download method to include session headers
        const originalDownload = bucket.download.bind(bucket);
        bucket.download = async (path: string, options?: any) => {
          console.log('🔄 Storage download with session headers:', {
            bucket: bucketName,
            path,
            sessionToken: sessionToken.substring(0, 8) + '...'
          });
          
          // Call download with custom headers
          const result = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${bucketName}/${path}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                'apikey': SUPABASE_PUBLISHABLE_KEY,
                'x-client-session': sessionToken,
                'x-client-info': 'supabase-js-web/2.50.0'
              }
            }
          );
          
          if (!result.ok) {
            const errorText = await result.text();
            console.error('❌ Storage download error:', {
              status: result.status,
              statusText: result.statusText,
              body: errorText
            });
            throw new Error(`Storage download failed: ${result.status} ${result.statusText}`);
          }
          
          const blob = await result.blob();
          return { data: blob, error: null };
        };
        
        // Override upload method to include session headers
        const originalUpload = bucket.upload.bind(bucket);
        bucket.upload = async (path: string, file: any, options?: any) => {
          console.log('🔄 Storage upload with session headers:', {
            bucket: bucketName,
            path,
            sessionToken: sessionToken.substring(0, 8) + '...',
            fileSize: file.size
          });
          
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('', file);
          
          // Call upload with custom headers
          const result = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${bucketName}/${path}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                'apikey': SUPABASE_PUBLISHABLE_KEY,
                'x-client-session': sessionToken,
                'x-client-info': 'supabase-js-web/2.50.0'
              },
              body: formData
            }
          );
          
          if (!result.ok) {
            const errorText = await result.text();
            console.error('❌ Storage upload error:', {
              status: result.status,
              statusText: result.statusText,
              body: errorText
            });
            return { 
              data: null, 
              error: { 
                message: `Upload failed: ${result.status} ${result.statusText}`,
                __isStorageError: true,
                name: 'StorageError'
              } as any
            };
          }
          
          const data = await result.json();
          return { data, error: null };
        };
        
        return bucket;
      }
    };
    
    return storageWrapper as any;
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