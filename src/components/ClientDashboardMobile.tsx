
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, CheckCircle, Clock, AlertCircle, Send, Link } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  property_type: string;
  status: string;
  created_at: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  action_required?: string;
}

interface ClientDashboardMobileProps {
  properties: Property[];
  tasks: Task[];
  onAddProperty: () => void;
  currentAgentAgency?: {
    agencyId: string;
    agencyName: string;
    agentId: string | null;
    agentName: string | null;
  } | null;
  onSubmitToAgency?: () => void;
}

const ClientDashboardMobile = ({ properties, tasks, onAddProperty, currentAgentAgency, onSubmitToAgency }: ClientDashboardMobileProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'action_required':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Debug UI - Remove after testing */}
      {currentAgentAgency?.agencyName ? (
        <div style={{ padding: '10px', backgroundColor: '#e0ffe0', fontSize: '12px' }}>
          ✅ Detected referral from {currentAgentAgency.agentName} at {currentAgentAgency.agencyName}
        </div>
      ) : (
        <div style={{ padding: '10px', backgroundColor: '#ffe0e0', fontSize: '12px' }}>
          ❌ No referral detected
        </div>
      )}

      {/* Agency Connection Banner */}
      {currentAgentAgency && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-3">
          <div className="flex items-center">
            <Link className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium text-sm">
              Connected to: {currentAgentAgency.agencyName}
              {currentAgentAgency.agentName && (
                <span className="text-blue-600"> • {currentAgentAgency.agentName}</span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h1 className="text-xl font-bold text-secura-black mb-2">My Dashboard</h1>
          <p className="text-sm text-gray-600">Manage your properties and track progress</p>
        </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={onAddProperty}
            className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Property
          </Button>
          
          {/* Agency submission button if referral context exists */}
          {currentAgentAgency?.agencyName && onSubmitToAgency && (
            <Button
              onClick={onSubmitToAgency}
              variant="outline"
              className="w-full border-secura-lime text-secura-teal hover:bg-secura-lime/10"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit to {currentAgentAgency.agencyName}
            </Button>
          )}
          
          {/* Debug button */}
          <Button 
            onClick={() => console.log("🎯 Mobile Context:", currentAgentAgency)} 
            variant="outline"
            className="w-full text-xs"
          >
            🧪 Debug: Log Context
          </Button>
        </CardContent>
      </Card>

      {/* Properties Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            My Properties ({properties.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {properties.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No properties added yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap "Add New Property" to get started</p>
            </div>
          ) : (
            properties.map((property) => (
              <div key={property.id} className="border rounded-lg p-3 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate">{property.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{property.location}</p>
                  </div>
                  <Badge className={`text-xs ml-2 ${getStatusColor(property.status)}`}>
                    {property.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="capitalize">{property.property_type}</span>
                  <span>{new Date(property.created_at).toLocaleDateString()}</span>
                </div>
                
                {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    {property.bedrooms && <span>{property.bedrooms} bed</span>}
                    {property.bathrooms && <span>{property.bathrooms} bath</span>}
                    {property.area_sqft && <span>{property.area_sqft} sqft</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Tasks Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Tasks & Updates ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No tasks yet</p>
              <p className="text-xs text-gray-400 mt-1">Tasks will appear here when assigned</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-3 bg-white">
                <div className="flex items-start gap-3">
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    {task.action_required && (
                      <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                        <p className="text-xs text-orange-800 font-medium">Action Required:</p>
                        <p className="text-xs text-orange-700">{task.action_required}</p>
                      </div>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default ClientDashboardMobile;
