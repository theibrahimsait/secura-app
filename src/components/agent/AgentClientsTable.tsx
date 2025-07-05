import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Client } from '@/types/agent';

interface AgentClientsTableProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

export const AgentClientsTable = ({ clients, onClientClick }: AgentClientsTableProps) => {
  const [clientsPage, setClientsPage] = useState(1);
  const clientsPerPage = 5;

  const totalClientsPages = Math.ceil(clients.length / clientsPerPage);
  const paginatedClients = clients.slice(
    (clientsPage - 1) * clientsPerPage,
    clientsPage * clientsPerPage
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Clients</CardTitle>
        <CardDescription>A list of your most recent clients</CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-medium">{client.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div>{client.email || 'N/A'}</div>
                      <div className="text-muted-foreground">{client.phone}</div>
                    </TableCell>
                    <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onClientClick(client)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Properties
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalClientsPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(clientsPage - 1) * clientsPerPage + 1} to {Math.min(clientsPage * clientsPerPage, clients.length)} of {clients.length} clients
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clientsPage === 1}
                    onClick={() => setClientsPage(clientsPage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {clientsPage} of {totalClientsPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clientsPage === totalClientsPages}
                    onClick={() => setClientsPage(clientsPage + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No clients yet</p>
            <p className="text-sm">Share your referral links to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};