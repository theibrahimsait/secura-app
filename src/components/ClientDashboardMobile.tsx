
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, CheckCircle, Clock, AlertCircle, Send, Link, Settings, LogOut, History, MessageSquare } from 'lucide-react';
import { useAgencyContext, type AgencyContext } from '@/hooks/useAgencyContext';
import AddPropertyModal from '@/components/AddPropertyModal';

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

interface PropertySubmission {
  id: string;
  property_id: string;
  agency_id: string;
  agent_id: string | null;
  status: string;
  submitted_at: string;
  agencies: {
    name: string;
  };
  users?: {
    full_name: string;
  } | null;
  property_title?: string;
  property_location?: string;
}

interface ClientDashboardMobileProps {
  properties: Property[];
  submissions?: PropertySubmission[];
  clientData: { id: string; full_name: string | null; email: string | null; phone: string; agent_id: string | null; agency_id: string | null; };
  onSubmitToAgency?: () => void;
  onOpenSubmission?: (submission: PropertySubmission) => void;
  onOpenAudit?: (submission: PropertySubmission) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

const ClientDashboardMobile = ({ properties, submissions = [], clientData, onSubmitToAgency, onOpenSubmission, onOpenAudit, onLogout, onOpenSettings }: ClientDashboardMobileProps) => {
  // Use the new session-safe agency context hook
  const { agencyContext } = useAgencyContext();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'under_review':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <img 
              src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
              alt="Secura" 
              className="h-8 w-auto"
            />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Agency Connection Banner */}
      {agencyContext && (
        <div className="bg-gradient-to-r from-secura-mint to-secura-lime/20 border-b border-secura-lime/30 px-4 py-3">
          <div className="flex items-center justify-center text-center">
            <Link className="w-4 h-4 text-secura-teal mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-secura-teal">
                Connected to {agencyContext.agencyName}
              </p>
              {agencyContext.agentName && (
                <p className="text-xs text-secura-moss">{agencyContext.agentName}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-20">
        {/* Quick Actions */}
        <div className="py-4">
          <div className="space-y-3">
            <AddPropertyModal
              clientData={clientData}
              onSuccess={() => window.location.reload()}
            />
            
            {agencyContext?.agencyName && onSubmitToAgency && (
              <Button
                onClick={onSubmitToAgency}
                variant="outline"
                className="w-full border-secura-teal text-secura-teal hover:bg-secura-mint h-12 text-base font-medium"
              >
                <Send className="w-5 h-5 mr-2" />
                Submit to {agencyContext.agencyName}
              </Button>
            )}
          </div>
        </div>

        {/* Properties Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-secura-teal" />
              My Properties
            </h2>
            <span className="text-sm text-gray-500">({properties.length})</span>
          </div>
          
          {properties.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500 mb-1">No properties added yet</p>
              <p className="text-xs text-gray-400">Tap "Add New Property" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-medium text-gray-900 text-base leading-tight mb-1">
                          {property.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-tight">
                          {property.location}
                        </p>
                      </div>
                      <Badge className={`text-xs px-2 py-1 font-medium border ${getStatusColor(property.status)} flex-shrink-0`}>
                        {property.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                      <span className="capitalize font-medium">{property.property_type}</span>
                      <span>{new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                      <div className="flex gap-4 text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                        {property.bedrooms && <span className="font-medium">{property.bedrooms} bed</span>}
                        {property.bathrooms && <span className="font-medium">{property.bathrooms} bath</span>}
                        {property.area_sqft && <span className="font-medium">{property.area_sqft} sqft</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Send className="w-5 h-5 mr-2 text-secura-teal" />
              My Submissions
            </h2>
            <span className="text-sm text-gray-500">({submissions.length})</span>
          </div>
          
          {submissions.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <Send className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500 mb-1">No submissions yet</p>
              <p className="text-xs text-gray-400">Submit properties to agencies to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-medium text-gray-900 text-base leading-tight mb-1">
                          {submission.property_title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-tight mb-2">
                          {submission.property_location}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {submission.agencies.name}
                          </Badge>
                          {submission.users && (
                            <Badge variant="secondary" className="text-xs">
                              {submission.users.full_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge className={`text-xs px-2 py-1 font-medium border ${getStatusColor(submission.status)} flex-shrink-0`}>
                        {submission.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {onOpenSubmission && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenSubmission(submission)}
                            className="text-secura-teal border-secura-teal hover:bg-secura-mint h-8 px-2 text-xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                        )}
                        {onOpenAudit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenAudit(submission)}
                            className="text-secura-moss border-secura-moss hover:bg-secura-mint h-8 px-3 text-xs"
                          >
                            <History className="w-3 h-3 mr-1" />
                            Audit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardMobile;
