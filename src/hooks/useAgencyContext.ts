import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface AgencyContext {
  agencyId: string;
  agencyName: string;
  agentId: string | null;
  agentName: string | null;
  agencyLogoUrl?: string;
  agencyPrimaryColor?: string;
}

const SESSION_STORAGE_KEY = 'agency_referral_context';
const URL_PARAM_KEY = 'ref';

export const useAgencyContext = () => {
  const [searchParams] = useSearchParams();
  const [agencyContext, setAgencyContext] = useState<AgencyContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract referral from URL and store in sessionStorage (tab-isolated)
  const extractAndStoreReferral = () => {
    const referralFromUrl = searchParams.get(URL_PARAM_KEY);
    
    if (referralFromUrl) {
      console.log('🔗 New referral detected in URL:', referralFromUrl);
      sessionStorage.setItem('agency_ref', referralFromUrl);
      return referralFromUrl;
    }

    // Check if we already have a referral in this tab
    const existingReferral = sessionStorage.getItem('agency_ref');
    console.log('🔗 Existing referral in sessionStorage:', existingReferral);
    return existingReferral;
  };

  // Resolve referral code to agency context using DB function
  const resolveAgencyContext = async (referralCode: string): Promise<AgencyContext | null> => {
    try {
      console.log('🔍 Resolving agency context for referral:', referralCode);
      
      const { data, error } = await supabase.rpc('resolve_referral_context', {
        referral_code: referralCode
      });

      if (error) {
        console.error('❌ Error resolving referral context:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No agency context found for referral:', referralCode);
        return null;
      }

      const contextData = data[0];
      const context: AgencyContext = {
        agencyId: contextData.agency_id,
        agencyName: contextData.agency_name,
        agentId: contextData.agent_id,
        agentName: contextData.agent_name,
        agencyLogoUrl: contextData.agency_logo_url,
        agencyPrimaryColor: contextData.agency_primary_color,
      };

      console.log('✅ Agency context resolved:', context);
      return context;
    } catch (error) {
      console.error('❌ Exception resolving agency context:', error);
      return null;
    }
  };

  // Load and cache agency context in sessionStorage
  const loadAgencyContext = async () => {
    setLoading(true);
    
    try {
      // First, check if we have cached context in sessionStorage
      const cachedContext = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (cachedContext && !searchParams.get(URL_PARAM_KEY)) {
        try {
          const parsed = JSON.parse(cachedContext);
          console.log('📋 Using cached agency context:', parsed);
          setAgencyContext(parsed);
          setLoading(false);
          return;
        } catch (error) {
          console.warn('⚠️ Invalid cached context, clearing:', error);
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      // Extract referral code from URL or sessionStorage
      const referralCode = extractAndStoreReferral();
      
      if (!referralCode) {
        console.log('ℹ️ No referral code found');
        setAgencyContext(null);
        setLoading(false);
        return;
      }

      // Resolve agency context
      const context = await resolveAgencyContext(referralCode);
      
      if (context) {
        // Cache in sessionStorage for this tab
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(context));
        setAgencyContext(context);
      } else {
        // Clear invalid referral
        sessionStorage.removeItem('agency_ref');
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setAgencyContext(null);
      }
    } catch (error) {
      console.error('❌ Error loading agency context:', error);
      setAgencyContext(null);
    } finally {
      setLoading(false);
    }
  };

  // Clear agency context (useful for testing or manual reset)
  const clearAgencyContext = () => {
    sessionStorage.removeItem('agency_ref');
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setAgencyContext(null);
  };

  // Load context on mount and when URL changes
  useEffect(() => {
    loadAgencyContext();
  }, [searchParams]);

  return {
    agencyContext,
    loading,
    clearAgencyContext,
    refreshContext: loadAgencyContext,
  };
};