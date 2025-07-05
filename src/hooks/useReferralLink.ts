import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useReferralLink = (agencyName: string) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState<string>('');

  const fetchOrCreateReferralLink = async () => {
    if (!userProfile?.id || !userProfile?.agency_id) return;
    
    try {
      // Try to fetch existing referral link
      const { data, error } = await supabase
        .from('referral_links')
        .select('id, slug, url')
        .eq('agent_id', userProfile.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching referral link:', error);
        toast({
          title: "Error",
          description: "Failed to load referral link.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        // Use existing referral link
        setReferralLink(`/client/login?ref=${data.id}`);
      } else {
        // Create new referral link if none exists
        const agentSlug = userProfile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'agent';
        const uniqueSlug = `${agentSlug}-${Date.now()}`;
        
        const { data: newLink, error: createError } = await supabase
          .from('referral_links')
          .insert({
            agent_id: userProfile.id,
            agency_id: userProfile.agency_id,
            slug: uniqueSlug,
            url: `/client/login?ref=`
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating referral link:', createError);
          toast({
            title: "Error",
            description: "Failed to create referral link.",
            variant: "destructive",
          });
          return;
        }

        if (newLink) {
          setReferralLink(`/client/login?ref=${newLink.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error with referral link:', error);
      toast({
        title: "Error",
        description: "Failed to load referral link.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (agencyName && userProfile) {
      fetchOrCreateReferralLink();
    }
  }, [agencyName, userProfile]);

  return { referralLink };
};