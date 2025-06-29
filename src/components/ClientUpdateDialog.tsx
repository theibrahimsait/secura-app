
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send, Paperclip } from 'lucide-react';

interface ClientUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  propertyTitle: string;
}

const ClientUpdateDialog = ({ isOpen, onClose, clientId, clientName, propertyTitle }: ClientUpdateDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSendUpdate = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide both title and message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      let documentUrl = null;
      
      // Upload document if attached
      if (attachedFile) {
        const fileName = `${Date.now()}-${attachedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(`updates/${fileName}`, attachedFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('property-documents')
          .getPublicUrl(uploadData.path);
        
        documentUrl = publicUrl;
      }

      // Create client notification
      const { error: notificationError } = await supabase
        .from('client_notifications')
        .insert({
          client_id: clientId,
          type: 'update_from_agency',
          title: title,
          message: message,
          metadata: {
            property_title: propertyTitle,
            document_url: documentUrl,
            document_name: attachedFile?.name
          }
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Update Sent Successfully",
        description: `Update sent to ${clientName}`,
      });

      // Reset form
      setTitle('');
      setMessage('');
      setAttachedFile(null);
      onClose();
    } catch (error) {
      console.error('Error sending update:', error);
      toast({
        title: "Failed to Send Update",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Update to Client</DialogTitle>
          <DialogDescription>
            Send an update to {clientName} regarding "{propertyTitle}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="update-title">Update Title</Label>
            <Input
              id="update-title"
              placeholder="e.g., Document Review Required"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="update-message">Message</Label>
            <Textarea
              id="update-message"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="attachment">Attach Document (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="attachment"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <Paperclip className="w-4 h-4 text-gray-500" />
            </div>
            {attachedFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {attachedFile.name}
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSendUpdate} disabled={sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Update'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientUpdateDialog;
