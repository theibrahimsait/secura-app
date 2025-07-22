import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, Eye, Phone, Mail, Check } from 'lucide-react';

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
  agent: {
    full_name: string;
  };
}

interface AgencyBuyersSectionProps {
  buyers: Buyer[];
  onApproveBuyer?: (buyerId: string) => void;
}

export const AgencyBuyersSection = ({ 
  buyers, 
  onApproveBuyer
}: AgencyBuyersSectionProps) => {
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

  if (buyers.length === 0) {
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
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No registered buyers yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Buyers will appear here when they submit their ID documents
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-secura-mint/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-secura-teal" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Buyers</p>
                <p className="text-2xl font-bold">{buyers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">
                  {buyers.filter(b => b.status === 'submitted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {buyers.filter(b => b.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buyers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-secura-teal" />
            Registered Buyers
          </CardTitle>
          <CardDescription>
            All clients who have submitted their ID documents for buyer registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer Information</TableHead>
                  <TableHead>Agent</TableHead>
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
                      <p className="font-medium text-gray-900">
                        {buyer.agent.full_name}
                      </p>
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
                        {buyer.status !== 'approved' && onApproveBuyer && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal border-secura-lime"
                            onClick={() => onApproveBuyer(buyer.id)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const details = `
Buyer Information:
Name: ${buyer.client.full_name}
Phone: ${buyer.client.phone}
Email: ${buyer.client.email}
Agent: ${buyer.agent.full_name}
Registered: ${new Date(buyer.created_at).toLocaleDateString()} at ${new Date(buyer.created_at).toLocaleTimeString()}
Status: ${buyer.status === 'submitted' ? 'Pending Review' : buyer.status.replace('_', ' ')}
                            `;
                            alert(details.trim());
                          }}
                          className="text-secura-teal border-secura-teal hover:bg-secura-mint"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};