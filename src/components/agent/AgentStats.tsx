import { Card, CardContent } from '@/components/ui/card';
import { Users, Home, CheckCircle, Calendar, UserCheck } from 'lucide-react';
import { Client, Property } from '@/types/agent';
import { useIsMobile } from '@/hooks/use-mobile';

interface Buyer {
  id: string;
  client_id: string;
  created_at: string;
  status: string;
  client: {
    full_name: string;
    phone: string;
    email: string;
  };
}

interface AgentStatsProps {
  clients: Client[];
  properties: Property[];
  buyers: Buyer[];
  referralLink: string;
}

export const AgentStats = ({ clients, properties, buyers, referralLink }: AgentStatsProps) => {
  const isMobile = useIsMobile();
  const thisMonthProperties = properties.filter(property => {
    const propertyDate = new Date(property.created_at);
    const now = new Date();
    return propertyDate.getMonth() === now.getMonth() && propertyDate.getFullYear() === now.getFullYear();
  }).length;

  const approvedBuyers = buyers.filter(buyer => buyer.status === 'approved').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
      <Card>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-secura-lime/10 flex items-center justify-center`}>
              <Users className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-secura-teal`} />
            </div>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Clients</p>
              <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-secura-black`}>{clients.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-secura-mint/20 flex items-center justify-center`}>
              <Home className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-secura-moss`} />
            </div>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Properties</p>
              <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-secura-black`}>{properties.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-blue-100 flex items-center justify-center`}>
              <UserCheck className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-600`} />
            </div>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Registered Buyers</p>
              <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-secura-black`}>{buyers.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-green-100 flex items-center justify-center`}>
              <CheckCircle className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-600`} />
            </div>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Approved Buyers</p>
              <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-secura-black`}>{approvedBuyers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};