import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSubmissionUpdates } from '@/hooks/useSubmissionUpdates';
import { logAgencySubmissionAction } from '@/lib/audit-logger';
import { Send, Paperclip, Download, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SubmissionTimelineProps {
  submissionId: string;
  className?: string;
}

export const SubmissionTimeline = ({ 
  submissionId, 
  className 
}: SubmissionTimelineProps) => {
  const { updates, loading, sending, unreadCount, sendUpdate, markAsRead } = useSubmissionUpdates(submissionId);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark messages as read when component mounts or when new unread messages arrive
  useEffect(() => {
    if (unreadCount > 0) {
      // Add a small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        markAsRead();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, markAsRead]);

  // Also mark as read when the component first loads with updates
  useEffect(() => {
    if (updates.length > 0 && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [updates.length, unreadCount, markAsRead]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [updates]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSendUpdate = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      toast({
        title: "Empty Message",
        description: "Please add a message or attach files.",
        variant: "destructive",
      });
      return;
    }

    await sendUpdate({
      submission_id: submissionId,
      message: newMessage.trim() || undefined,
      files: selectedFiles.length > 0 ? selectedFiles : undefined
    });

    // Reset form
    setNewMessage('');
    setSelectedFiles([]);
    // Reset file input
    const fileInput = document.getElementById('agency-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      console.log('🔍 === AGENCY FILE DOWNLOAD ===');
      console.log('🔍 File path:', filePath);
      console.log('🔍 File name:', fileName);

      console.log('🚀 Starting file download:', { filePath, fileName });
      
      // Call the download edge function with response type blob
      const response = await fetch(`https://yugzvvgctlhfcdmmwaxj.supabase.co/functions/v1/download-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Z3p2dmdjdGxoZmNkbW13YXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Nzg0MjUsImV4cCI6MjA2NjE1NDQyNX0.VFiQYl32DVznDs0vEei6Ez7F_9OjAn74NdrAM1WQaG4`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          userType: 'agency'
        })
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Download request failed:', { 
          status: response.status, 
          statusText: response.statusText,
          body: responseText 
        });
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || 'Download failed');
        } catch {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
      }

      // Get the file as a blob
      const blob = await response.blob();
      console.log('📦 File blob received:', { size: blob.size, type: blob.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ File downloaded successfully');

      // Log audit action for file download
      if (userProfile?.id) {
        await logAgencySubmissionAction({
          submissionId: submissionId,
          actorType: 'agency_admin',
          actorId: userProfile.id,
          action: 'downloaded_file',
          fileName: fileName
        });
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not download the file.",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const getSenderInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getSenderColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'agent': return 'bg-blue-500';
      case 'client': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`${className} h-full flex flex-col bg-white border rounded-lg shadow-sm`}>
      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {unreadCount > 0 && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-center">
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>Loading conversation...</p>
            </div>
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message below</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`text-white text-xs ${getSenderColor(update.sender_role)}`}>
                    {getSenderInitials(update.sender_name || 'UN')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{update.sender_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {update.sender_role === 'admin' ? 'You' : update.sender_role}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(update.created_at)}
                    </span>
                  </div>
                  
                  {update.message && (
                    <div className={`rounded-lg p-3 text-sm max-w-lg ${
                      update.sender_role === 'admin' 
                        ? 'bg-red-500 text-white ml-4' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {update.message}
                    </div>
                  )}
                  
                  {update.attachments && update.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {update.attachments.map((attachment) => (
                        <div 
                          key={attachment.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 max-w-xs"
                          onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                        >
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                          <Download className="w-4 h-4 text-gray-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form - Fixed at Bottom */}
      <div className="flex-shrink-0 border-t bg-gray-50 p-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Type your message to the client..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={2}
            className="resize-none"
          />
          
          <div className="flex items-center gap-2">
            <Input
              id="agency-file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="flex-1 text-xs"
            />
            <Paperclip className="w-4 h-4 text-gray-500" />
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(", ")}
            </div>
          )}
          
          <Button 
            onClick={handleSendUpdate} 
            disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
            className="w-full"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </div>
    </div>
  );
};