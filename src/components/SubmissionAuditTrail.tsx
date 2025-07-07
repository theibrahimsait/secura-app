import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Download, MessageSquare, Send, Clock, History } from 'lucide-react';
import { getSubmissionAuditLogs } from '@/lib/audit-logger';

interface AuditLog {
  id: string;
  submission_id: string;
  actor_type: 'client' | 'agent' | 'agency_admin';
  actor_id: string | null;
  action: string;
  file_name: string | null;
  created_at: string;
}

interface SubmissionAuditTrailProps {
  submissionId: string;
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'submitted':
      return <Send className="w-4 h-4 text-secura-teal" />;
    case 'viewed_file':
      return <Eye className="w-4 h-4 text-secura-moss" />;
    case 'downloaded_file':
      return <Download className="w-4 h-4 text-secura-moss" />;
    case 'message_sent':
      return <MessageSquare className="w-4 h-4 text-secura-teal" />;
    case 'file_uploaded':
      return <FileText className="w-4 h-4 text-secura-teal" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActionText = (log: AuditLog) => {
  const actor = log.actor_type === 'client' ? 'You' : 
                log.actor_type === 'agency_admin' ? 'Agency admin' : 'Agent';
  
  switch (log.action) {
    case 'submitted':
      return `${actor} submitted the property`;
    case 'viewed_file':
      return `${actor} viewed file ${log.file_name || 'unknown'}`;
    case 'downloaded_file':
      return `${actor} downloaded file ${log.file_name || 'unknown'}`;
    case 'message_sent':
      return `${actor} sent a message`;
    case 'file_uploaded':
      return `${actor} uploaded file ${log.file_name || 'unknown'}`;
    default:
      return `${actor} performed action: ${log.action}`;
  }
};

const getActorBadgeVariant = (actorType: string) => {
  switch (actorType) {
    case 'client':
      return 'default';
    case 'agency_admin':
      return 'secondary';
    case 'agent':
      return 'outline';
    default:
      return 'secondary';
  }
};

export const SubmissionAuditTrail = ({ 
  submissionId, 
  isOpen, 
  onClose, 
  propertyTitle 
}: SubmissionAuditTrailProps) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && submissionId) {
      loadAuditLogs();
    }
  }, [isOpen, submissionId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await getSubmissionAuditLogs(submissionId);
      setAuditLogs(logs as AuditLog[]);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Audit Trail
          </DialogTitle>
          <DialogDescription>
            Activity history for {propertyTitle}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border border-secura-mint/30 rounded-lg hover:bg-secura-mint/10 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {getActionText(log)}
                      </p>
                      <Badge 
                        variant={getActorBadgeVariant(log.actor_type)}
                        className="text-xs"
                      >
                        {log.actor_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    #{auditLogs.length - index}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex-shrink-0 flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};