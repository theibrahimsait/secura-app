export interface Client {
  id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  location: string;
  property_type: string;
  client_id: string;
  created_at: string;
  client_name?: string;
  source?: 'joined' | 'direct';
}

export interface GenerateLinkForm {
  clientName: string;
  clientPhone: string;
}

export interface ReferralLink {
  id: string;
  ref_token: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}