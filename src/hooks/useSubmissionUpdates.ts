import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SubmissionUpdate, CreateUpdateData, SubmissionUpdateAttachment } from '@/types/submission-updates';

export const useSubmissionUpdates = (submissionId: string | null) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [updates, setUpdates] = useState<SubmissionUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUpdates = useCallback(async () => {
    if (!submissionId) return;

    setLoading(true);
    try {
      const { data: updatesData, error: updatesError } = await supabase
        .from('submission_updates')
        .select(`
          *,
          users!fk_submission_updates_sender(full_name),
          clients!fk_submission_updates_client(full_name),
          submission_update_attachments(*)
        `)
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

      if (updatesError) throw updatesError;

      // Calculate unread count (messages from other party)
      const myRole = userProfile?.role === 'superadmin' ? 'admin' : userProfile?.role;
      const unreadMessages = (updatesData || []).filter(update => 
        !update.is_read && 
        ((myRole === 'client' && ['admin', 'agent'].includes(update.sender_role)) ||
         (['admin', 'agent'].includes(myRole!) && update.sender_role === 'client'))
      );
      setUnreadCount(unreadMessages.length);

      const formattedUpdates: SubmissionUpdate[] = (updatesData || []).map(update => ({
        id: update.id,
        submission_id: update.submission_id,
        sender_role: update.sender_role as 'admin' | 'agent' | 'client',
        sender_id: update.sender_id,
        client_id: update.client_id,
        message: update.message,
        created_at: update.created_at,
        sender_name: update.users?.full_name || update.clients?.full_name || 'Unknown',
        attachments: update.submission_update_attachments || [],
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
  }, [submissionId, toast, userProfile]);

  const markAsRead = useCallback(async () => {
    if (!submissionId || !userProfile) return;

    try {
      const userRole = userProfile.role === 'superadmin' ? 'admin' : userProfile.role;
      await supabase.rpc('mark_submission_updates_as_read', {
        p_submission_id: submissionId,
        p_user_role: userRole === 'client' ? 'client' : null
      });
      
      // Refresh to get updated read status
      await fetchUpdates();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [submissionId, userProfile, fetchUpdates]);

  const sendUpdate = useCallback(async (data: CreateUpdateData) => {
    if (!userProfile?.id) return;

    setSending(true);
    try {
      // Create the update record
      const updateData = {
        submission_id: data.submission_id,
        sender_role: userProfile.role === 'superadmin' ? 'admin' : userProfile.role,
        sender_id: userProfile.id,
        message: data.message || null
      };

      const { data: insertedUpdate, error: updateError } = await supabase
        .from('submission_updates')
        .insert(updateData)
        .select()
        .single();

      if (updateError) throw updateError;

      // Upload files if any
      if (data.files && data.files.length > 0) {
        const attachmentPromises = data.files.map(async (file) => {
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = `submissions/${data.submission_id}/updates/${fileName}`;
          
          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-documents')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from('submission_update_attachments')
            .insert({
              update_id: insertedUpdate.id,
              file_name: file.name,
              file_path: uploadData.path,
              file_size: file.size,
              mime_type: file.type
            });

          if (attachmentError) throw attachmentError;
        });

        await Promise.all(attachmentPromises);
      }

      toast({
        title: "Update Sent",
        description: "Your message has been sent successfully.",
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
  }, [userProfile, toast, fetchUpdates]);

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