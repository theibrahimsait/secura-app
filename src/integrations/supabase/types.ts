export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          description: string | null
          email: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agency_notifications: {
        Row: {
          agency_id: string
          agent_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          property_id: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          property_id?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          property_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "client_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_referral_links: {
        Row: {
          agency_id: string
          agent_id: string
          client_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          ref_token: string
        }
        Insert: {
          agency_id: string
          agent_id: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          ref_token?: string
        }
        Update: {
          agency_id?: string
          agent_id?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          ref_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_referral_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_referral_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_referral_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          client_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          client_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          client_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_verified: boolean | null
          mime_type: string
          uploaded_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          client_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_verified?: boolean | null
          mime_type: string
          uploaded_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          client_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_verified?: boolean | null
          mime_type?: string
          uploaded_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_links: {
        Row: {
          agency_id: string
          agent_id: string
          client_name: string
          client_phone: string
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          link_token: string
          used_at: string | null
        }
        Insert: {
          agency_id: string
          agent_id: string
          client_name: string
          client_phone: string
          client_type: Database["public"]["Enums"]["client_type"]
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          link_token: string
          used_at?: string | null
        }
        Update: {
          agency_id?: string
          agent_id?: string
          client_name?: string
          client_phone?: string
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          link_token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          property_id: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          property_id?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          property_id?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "client_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_properties: {
        Row: {
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          client_id: string
          created_at: string | null
          created_by: string | null
          details: Json | null
          id: string
          location: string
          property_type: Database["public"]["Enums"]["property_type"]
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          location: string
          property_type: Database["public"]["Enums"]["property_type"]
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          location?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_properties_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sessions: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          last_used_at: string | null
          session_token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          session_token: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          action_required: string | null
          agency_id: string
          agent_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          property_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_required?: string | null
          agency_id: string
          agent_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_required?: string | null
          agency_id?: string
          agent_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "client_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agency_id: string | null
          agent_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          last_login: string | null
          mobile_number: string
          onboarding_completed: boolean | null
          onboarding_status: Json | null
          otp_code: string | null
          otp_expires_at: string | null
          phone: string
          profile_completed: boolean | null
          referral_link_id: string | null
          referral_token: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          agent_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_login?: string | null
          mobile_number: string
          onboarding_completed?: boolean | null
          onboarding_status?: Json | null
          otp_code?: string | null
          otp_expires_at?: string | null
          phone: string
          profile_completed?: boolean | null
          referral_link_id?: string | null
          referral_token?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          agent_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_login?: string | null
          mobile_number?: string
          onboarding_completed?: boolean | null
          onboarding_status?: Json | null
          otp_code?: string | null
          otp_expires_at?: string | null
          phone?: string
          profile_completed?: boolean | null
          referral_link_id?: string | null
          referral_token?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "agent_referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          property_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          property_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          agency_id: string
          agent_id: string
          client_id: string
          created_at: string
          details: Json | null
          id: string
          location: string
          property_type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          agent_id: string
          client_id: string
          created_at?: string
          details?: Json | null
          id?: string
          location: string
          property_type: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agent_id?: string
          client_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          location?: string
          property_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      property_agency_submissions: {
        Row: {
          agency_id: string
          agent_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          property_id: string | null
          reviewed_at: string | null
          sold_at: string | null
          sold_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          property_id?: string | null
          reviewed_at?: string | null
          sold_at?: string | null
          sold_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          property_id?: string | null
          reviewed_at?: string | null
          sold_at?: string | null
          sold_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_agency_submissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agency_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agency_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agency_submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agency_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "client_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agency_submissions_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agency_submissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          client_id: string
          client_property_id: string | null
          created_by: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          property_id: string
          updated_by: string | null
          uploaded_at: string | null
        }
        Insert: {
          client_id: string
          client_property_id?: string | null
          created_by?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          property_id: string
          updated_by?: string | null
          uploaded_at?: string | null
        }
        Update: {
          client_id?: string
          client_property_id?: string | null
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          property_id?: string
          updated_by?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_property_documents_client_property"
            columns: ["client_property_id"]
            isOneToOne: false
            referencedRelation: "client_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "client_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          agency_id: string
          agent_id: string
          created_at: string | null
          id: string
          slug: string
          url: string
        }
        Insert: {
          agency_id: string
          agent_id: string
          created_at?: string | null
          id?: string
          slug: string
          url: string
        }
        Update: {
          agency_id?: string
          agent_id?: string
          created_at?: string | null
          id?: string
          slug?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string | null
          file_name: string | null
          id: string
          submission_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string | null
          file_name?: string | null
          id?: string
          submission_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string | null
          file_name?: string | null
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_audit_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "property_agency_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_update_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          update_id: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          update_id: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          update_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_update_attachments_update"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "submission_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_updates: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          sender_id: string | null
          sender_role: string
          submission_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          sender_id?: string | null
          sender_role: string
          submission_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          sender_id?: string | null
          sender_role?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_submission_updates_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_submission_updates_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_submission_updates_submission"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "property_agency_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      test: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          agency_id: string | null
          auth_user_id: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_client_request: {
        Args: { client_session_token: string }
        Returns: string
      }
      debug_client_session: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_client_id_from_session: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_client_id_from_session_readonly: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_client_submission_updates: {
        Args: { p_client_session_token: string; p_submission_id?: string }
        Returns: {
          id: string
          submission_id: string
          sender_role: string
          sender_id: string
          client_id: string
          message: string
          created_at: string
          is_read: boolean
          sender_name: string
          attachments: Json
        }[]
      }
      get_current_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_superadmin_auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_unread_submission_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          submission_id: string
          unread_count: number
        }[]
      }
      is_client_authorized: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_user_id: string
          p_client_id: string
          p_action: Database["public"]["Enums"]["audit_action"]
          p_resource_type: string
          p_resource_id: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      mark_submission_updates_as_read: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      refresh_jwt_metadata: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      resolve_referral_context: {
        Args: { referral_code: string }
        Returns: {
          agency_id: string
          agency_name: string
          agent_id: string
          agent_name: string
          agency_logo_url: string
          agency_primary_color: string
        }[]
      }
    }
    Enums: {
      audit_action:
        | "login"
        | "logout"
        | "view"
        | "download"
        | "upload"
        | "create"
        | "update"
        | "delete"
        | "sms_sent"
      client_referral_link_id:
        | "0"
        | "1"
        | "2"
        | "3"
        | "4"
        | "5"
        | "6"
        | "7"
        | "8"
        | "9"
        | "10"
      client_type: "buy" | "sell" | "rent"
      document_type:
        | "emirates_id"
        | "passport"
        | "visa"
        | "title_deed"
        | "power_of_attorney"
        | "noc"
        | "ejari"
        | "dewa_bill"
        | "other"
      property_type:
        | "apartment"
        | "villa"
        | "townhouse"
        | "penthouse"
        | "studio"
        | "office"
        | "retail"
        | "warehouse"
        | "land"
      submission_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "additional_info_required"
      task_status: "pending" | "action_required" | "in_progress" | "completed"
      user_role: "superadmin" | "agency_admin" | "agent" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: [
        "login",
        "logout",
        "view",
        "download",
        "upload",
        "create",
        "update",
        "delete",
        "sms_sent",
      ],
      client_referral_link_id: [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
      ],
      client_type: ["buy", "sell", "rent"],
      document_type: [
        "emirates_id",
        "passport",
        "visa",
        "title_deed",
        "power_of_attorney",
        "noc",
        "ejari",
        "dewa_bill",
        "other",
      ],
      property_type: [
        "apartment",
        "villa",
        "townhouse",
        "penthouse",
        "studio",
        "office",
        "retail",
        "warehouse",
        "land",
      ],
      submission_status: [
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "additional_info_required",
      ],
      task_status: ["pending", "action_required", "in_progress", "completed"],
      user_role: ["superadmin", "agency_admin", "agent", "client"],
    },
  },
} as const
