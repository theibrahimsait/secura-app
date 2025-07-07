import { clientSupabase } from './client-supabase';

export interface AuditLogParams {
  submissionId: string;
  actorType: 'client' | 'agent' | 'agency_admin';
  actorId?: string;
  action: string;
  fileName?: string;
}

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