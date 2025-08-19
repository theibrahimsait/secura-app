import { useState, useEffect, useCallback } from 'react';
import { clientSupabase } from '@/lib/client-supabase';
import { useToast } from '@/hooks/use-toast';
import { logSubmissionAction } from '@/lib/audit-logger';
import { SubmissionUpdate, CreateUpdateData } from '@/types/submission-updates';

export const useClientSubmissionUpdates = (submissionId: string | null, clientId: string) => {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<SubmissionUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUpdates = useCallback(async () => {
    if (!submissionId) return;

    setLoading(true);
    try {
      console.log('🔍 Client fetching updates for submission:', submissionId);
      
      // Get session token
      const sessionToken = clientSupabase.getSessionToken();
      if (!sessionToken) {
        console.error('❌ No session token available');
        return;
      }

      // Use the direct function call instead of table query
      const { data: updatesData, error: updatesError } = await clientSupabase
        .rpc('get_client_submission_updates', {
          p_client_session_token: sessionToken,
          p_submission_id: submissionId
        });

      console.log('📥 Raw updates data received:', updatesData);
      console.log('❌ Updates error (if any):', updatesError);

      if (updatesError) throw updatesError;

      // Calculate unread count (messages from agency staff)
      const unreadMessages = (updatesData || []).filter(update => 
        !update.is_read && update.sender_role === 'admin'
      );
      setUnreadCount(unreadMessages.length);

      const formattedUpdates: SubmissionUpdate[] = (updatesData || []).map(update => ({
        id: update.id,
        submission_id: update.submission_id,
        sender_role: update.sender_role as 'admin' | 'client',
        sender_id: update.sender_id,
        client_id: update.client_id,
        message: update.message,
        created_at: update.created_at,
        sender_name: update.sender_name || 'Unknown',
        attachments: update.attachments || [],
        is_read: update.is_read
      }));

      setUpdates(formattedUpdates);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation updates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [submissionId, toast]);

  const markAsRead = useCallback(async () => {
    if (!submissionId) return;

    try {
      await clientSupabase.rpc('mark_submission_updates_as_read', {
        p_submission_id: submissionId
      });
      
      // Refresh to get updated read status
      await fetchUpdates();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Don't show toast error for this as it's automatic
    }
  }, [submissionId, fetchUpdates]);

  const sendUpdate = useCallback(async (data: CreateUpdateData) => {
    setSending(true);
    try {
      // Create the update record
      const updateData = {
        submission_id: data.submission_id,
        sender_role: 'client' as const,
        client_id: clientId,
        sender_id: null, // Clients don't have sender_id
        message: data.message || null
      };

      const { data: insertedUpdate, error: updateError } = await clientSupabase
        .from('submission_updates')
        .insert(updateData)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log audit action for client message (if any text)
      if (data.message && data.message.trim().length > 0) {
        await logSubmissionAction({
          submissionId: data.submission_id,
          actorType: 'client',
          actorId: clientId,
          action: 'message_sent'
        });
      }

      if (data.files && data.files.length > 0) {
        const attachmentPromises = data.files.map(async (file) => {
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = `submissions/${data.submission_id}/updates/${fileName}`;
          
          console.log('🔄 Uploading file:', { fileName, filePath });
          
          // Upload file to storage
          const { data: uploadData, error: uploadError } = await clientSupabase.storage
            .from('submission-updates')
            .upload(filePath, file);

          console.log('📤 Upload result:', { uploadData, uploadError });
          if (uploadError) throw uploadError;

          // Store the constructed path (not uploadData.path) for consistency
          const storedPath = filePath;
          console.log('💾 Storing file path in DB:', storedPath);

          // Create attachment record
          const { error: attachmentError } = await clientSupabase
            .from('submission_update_attachments')
            .insert({
              update_id: insertedUpdate.id,
              file_name: file.name,
              file_path: storedPath, // Use our constructed path
              file_size: file.size,
              mime_type: file.type
            });

          if (attachmentError) throw attachmentError;

          // Log audit action for client file upload
          await logSubmissionAction({
            submissionId: data.submission_id,
            actorType: 'client',
            actorId: clientId,
            action: 'file_uploaded',
            fileName: file.name
          });
        });

        await Promise.all(attachmentPromises);
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the agency.",
      });

      // Refresh updates
      await fetchUpdates();
    } catch (error) {
      console.error('Error sending update:', error);
      toast({
        title: "Failed to Send", 
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [clientId, toast, fetchUpdates]);

  useEffect(() => {
    if (submissionId) {
      fetchUpdates();
    }
  }, [submissionId, fetchUpdates]);

  return {
    updates,
    loading,
    sending,
    unreadCount,
    sendUpdate,
    markAsRead,
    refetchUpdates: fetchUpdates
  };
};