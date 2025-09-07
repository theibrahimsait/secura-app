import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export const SupabaseTest = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('Testing connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from('test').select('*').limit(1);
      
      if (error) {
        setTestResult(`Connection test failed: ${error.message}`);
      } else {
        setTestResult('✅ Supabase connection working!');
      }
    } catch (err) {
      setTestResult(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setLoading(true);
    setTestResult('Testing auth endpoint...');
    
    try {
      // Test if we can reach auth endpoint
      const response = await fetch('https://yugzvvgctlhfcdmmwaxj.supabase.co/auth/v1/settings', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Z3p2dmdjdGxoZmNkbW13YXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Nzg0MjUsImV4cCI6MjA2NjE1NDQyNX0.VFiQYl32DVznDs0vEei6Ez7F_9OjAn74NdrAM1WQaG4'
        }
      });
      
      if (response.ok) {
        setTestResult('✅ Auth endpoint reachable!');
      } else {
        setTestResult(`❌ Auth endpoint error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setTestResult(`❌ Auth endpoint unreachable: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 border rounded shadow-lg z-50 max-w-md">
      <h3 className="font-bold mb-2">Supabase Connection Test</h3>
      <div className="space-y-2">
        <Button onClick={testConnection} disabled={loading} className="w-full">
          Test Database Connection
        </Button>
        <Button onClick={testAuth} disabled={loading} className="w-full">
          Test Auth Endpoint
        </Button>
      </div>
      {testResult && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
          {testResult}
        </div>
      )}
    </div>
  );
};