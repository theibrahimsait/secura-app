import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, MessageSquare, Phone, Mail } from 'lucide-react';

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

interface AgentBuyersTableProps {
  buyers: Buyer[];
  onContactBuyer?: (buyer: Buyer) => void;
}

export const AgentBuyersTable = ({ buyers, onContactBuyer }: AgentBuyersTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCheck className="w-5 h-5 mr-2 text-secura-teal" />
          Registered Buyers
        </CardTitle>
        <CardDescription>
          Clients who have submitted their ID documents for buyer registration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {buyers.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No registered buyers yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Buyers will appear here when they submit their ID documents
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer Information</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyers.map((buyer) => (
                  <TableRow key={buyer.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {buyer.client.full_name}
                        </p>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {buyer.client.phone}
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {buyer.client.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">
                          {new Date(buyer.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500">
                          {new Date(buyer.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(buyer.status)}>
                        {buyer.status === 'submitted' ? 'Pending Review' : buyer.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {onContactBuyer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onContactBuyer(buyer)}
                            className="text-secura-teal border-secura-teal hover:bg-secura-mint"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contact
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};