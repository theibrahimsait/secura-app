import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSubmissionUpdates } from '@/hooks/useSubmissionUpdates';
import { Send, Paperclip, Download, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SubmissionUpdate } from '@/types/submission-updates';

interface SubmissionTimelineProps {
  submissionId: string;
  className?: string;
}

export const SubmissionTimeline = ({ submissionId, className }: SubmissionTimelineProps) => {
  const { updates, loading, sending, unreadCount, sendUpdate, markAsRead } = useSubmissionUpdates(submissionId);
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Mark messages as read when component mounts or updates are received
  useEffect(() => {
    if (unreadCount > 0) {
      markAsRead();
    }
  }, [unreadCount, markAsRead]);

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
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('submission-updates')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the file.",
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
    <Card className={`${className} flex flex-col h-full`}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Communication Timeline
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 space-y-4 p-4">
        {/* Timeline */}
        <div className="flex-1 space-y-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading conversation...
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation by sending a message below</p>
            </div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`text-white text-xs ${getSenderColor(update.sender_role)}`}>
                    {getSenderInitials(update.sender_name || 'UN')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{update.sender_name}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {update.sender_role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(update.created_at)}
                    </span>
                  </div>
                  
                  {update.message && (
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      {update.message}
                    </div>
                  )}
                  
                  {update.attachments && update.attachments.length > 0 && (
                    <div className="space-y-2">
                      {update.attachments.map((attachment) => (
                        <div 
                          key={attachment.id}
                          className="flex items-center gap-2 p-2 bg-card border rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm flex-1">{attachment.file_name}</span>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Send Message Form */}
        <div className="flex-shrink-0 border-t pt-4 space-y-3">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={2}
            className="resize-none"
          />
          
          <div className="flex items-center gap-2">
            <Input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="flex-1"
            />
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(', ')}
            </div>
          )}
          
          <Button 
            onClick={handleSendUpdate} 
            disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};