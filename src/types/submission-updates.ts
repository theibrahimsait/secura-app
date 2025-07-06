export interface SubmissionUpdate {
  id: string;
  submission_id: string;
  sender_role: 'admin' | 'agent' | 'client';
  sender_id?: string;
  client_id?: string;
  message?: string;
  created_at: string;
  sender_name?: string;
  attachments?: SubmissionUpdateAttachment[];
  is_read?: boolean;
}

export interface SubmissionUpdateAttachment {
  id: string;
  update_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface CreateUpdateData {
  submission_id: string;
  message?: string;
  files?: File[];
}