import { Card, CardContent } from '@/components/ui/card';
import { Users, Home, LinkIcon, Activity } from 'lucide-react';
import { Client, Property } from '@/types/agent';

interface AgentStatsProps {
  clients: Client[];
  properties: Property[];
  referralLink: string;
}

export const AgentStats = ({ clients, properties, referralLink }: AgentStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <p className="text-sm text-muted-foreground">Properties</p>
              <p className="text-2xl font-bold text-secura-black">{properties.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-secura-teal/10 flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-secura-teal" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Referral Links</p>
              <p className="text-2xl font-bold text-secura-black">{referralLink ? '1' : '0'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};