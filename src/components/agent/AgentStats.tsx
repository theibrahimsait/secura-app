import { Card, CardContent } from '@/components/ui/card';
import { Users, Home, CheckCircle, Calendar } from 'lucide-react';
import { Client, Property } from '@/types/agent';

interface AgentStatsProps {
  clients: Client[];
  properties: Property[];
  referralLink: string;
}

export const AgentStats = ({ clients, properties, referralLink }: AgentStatsProps) => {
  const thisMonthProperties = properties.filter(property => {
    const propertyDate = new Date(property.created_at);
    const now = new Date();
    return propertyDate.getMonth() === now.getMonth() && propertyDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-secura-teal" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold text-secura-black">{clients.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center">
              <Home className="w-6 h-6 text-secura-moss" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Properties</p>
              <p className="text-2xl font-bold text-secura-black">{properties.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};