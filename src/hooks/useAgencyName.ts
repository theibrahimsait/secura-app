import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAgencyName = () => {
  const { userProfile } = useAuth();
  const [agencyName, setAgencyName] = useState<string>('');

  const fetchAgencyName = async () => {
    if (!userProfile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', userProfile.agency_id)
        .single();

      if (error) throw error;
      setAgencyName(data.name || '');
    } catch (error: any) {
      console.error('Error fetching agency name:', error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchAgencyName();
    }
  }, [userProfile]);

  return { agencyName };
};