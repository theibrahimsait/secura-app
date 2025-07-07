import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Client, Property } from '@/types/agent';
import { useAgentData } from '@/hooks/useAgentData';
import { useAgencyName } from '@/hooks/useAgencyName';
import { useReferralLink } from '@/hooks/useReferralLink';
import { AgentStats } from '@/components/agent/AgentStats';
import { AgentReferralLink } from '@/components/agent/AgentReferralLink';
import { AgentClientsTable } from '@/components/agent/AgentClientsTable';
import { AgentPropertiesTable } from '@/components/agent/AgentPropertiesTable';
import { ClientPropertiesModal } from '@/components/agent/ClientPropertiesModal';
import { PropertyDetailsModal } from '@/components/agent/PropertyDetailsModal';

const AgentDashboard = () => {
  const { signOut, userProfile, loading, isAuthenticated } = useAuth();
  const { clients, properties } = useAgentData();
  const { agencyName } = useAgencyName();
  const { referralLink } = useReferralLink(agencyName);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-secura-black">Agent Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your clients and properties</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secura-black">{userProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{agencyName || 'Real Estate Agent'}</p>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="border-secura-moss text-secura-black hover:bg-secura-moss/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <AgentStats 
          clients={clients} 
          properties={properties} 
          referralLink={referralLink} 
        />

        {/* Permanent Referral Link */}
        <AgentReferralLink referralLink={referralLink} />

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AgentClientsTable 
            clients={clients} 
            onClientClick={handleClientClick} 
          />
          <AgentPropertiesTable 
            properties={properties} 
            onPropertyClick={handlePropertyClick} 
          />
        </div>
        
        {/* Client Properties Modal */}
        <ClientPropertiesModal
          client={selectedClient}
          open={!!selectedClient}
          onOpenChange={() => setSelectedClient(null)}
        />
        
        {/* Property Details Modal */}
        <PropertyDetailsModal
          property={selectedProperty}
          open={!!selectedProperty}
          onOpenChange={() => setSelectedProperty(null)}
        />
      </main>
    </div>
  );
};

export default AgentDashboard;