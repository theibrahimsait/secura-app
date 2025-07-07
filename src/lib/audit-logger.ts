import { clientSupabase } from './client-supabase';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogParams {
  submissionId: string;
  actorType: 'client' | 'agent' | 'agency_admin';
  actorId?: string;
  action: string;
  fileName?: string;
}

// For client context
export const logSubmissionAction = async ({
  submissionId,
  actorType,
  actorId,
  action,
  fileName
}: AuditLogParams) => {
  try {
    const { error } = await clientSupabase
      .from('submission_audit_logs')
      .insert({
        submission_id: submissionId,
        actor_type: actorType,
        actor_id: actorId,
        action,
        file_name: fileName
      });

    if (error) {
      console.error('Failed to log audit action:', error);
    }
  } catch (err) {
    console.error('Error logging audit action:', err);
  }
};

// For agency admin context
export const logAgencySubmissionAction = async ({
  submissionId,
  actorType,
  actorId,
  action,
  fileName
}: AuditLogParams) => {
  try {
    const { error } = await supabase
      .from('submission_audit_logs')
      .insert({
        submission_id: submissionId,
        actor_type: actorType,
        actor_id: actorId,
        action,
        file_name: fileName
      });

    if (error) {
      console.error('Failed to log agency audit action:', error);
    }
  } catch (err) {
    console.error('Error logging agency audit action:', err);
  }
};

export const getSubmissionAuditLogs = async (submissionId: string) => {
  const { data, error } = await clientSupabase
    .from('submission_audit_logs')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }

  return data || [];
};