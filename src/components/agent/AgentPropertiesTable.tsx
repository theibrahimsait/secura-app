import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Home, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Property } from '@/types/agent';

interface AgentPropertiesTableProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
}

export const AgentPropertiesTable = ({ properties, onPropertyClick }: AgentPropertiesTableProps) => {
  const [propertiesPage, setPropertiesPage] = useState(1);
  const propertiesPerPage = 5;

  const totalPropertiesPages = Math.ceil(properties.length / propertiesPerPage);
  const paginatedProperties = properties.slice(
    (propertiesPage - 1) * propertiesPerPage,
    propertiesPage * propertiesPerPage
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Properties</CardTitle>
        <CardDescription>A list of properties you manage</CardDescription>
      </CardHeader>
      <CardContent>
        {properties.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProperties.map((property) => (
                  <TableRow key={property.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{property.location}</div>
                      <div className="text-muted-foreground capitalize">{property.property_type}</div>
                    </TableCell>
                    <TableCell>{property.client_name}</TableCell>
                    <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPropertyClick(property)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPropertiesPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(propertiesPage - 1) * propertiesPerPage + 1} to {Math.min(propertiesPage * propertiesPerPage, properties.length)} of {properties.length} properties
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={propertiesPage === 1}
                    onClick={() => setPropertiesPage(propertiesPage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {propertiesPage} of {totalPropertiesPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={propertiesPage === totalPropertiesPages}
                    onClick={() => setPropertiesPage(propertiesPage + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No properties yet</p>
            <p className="text-sm">Properties will appear here when clients submit them</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};