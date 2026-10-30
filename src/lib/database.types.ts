export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Profile = {
  id: string;
  email: string;
  email_verified: boolean;
  full_name: string;
  account_status: "active" | "blocked";
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPermission = {
  user_id: string;
  can_submit_websites: boolean;
  can_submit_apps: boolean;
  website_limit: number;
  app_limit: number;
  unlimited_websites: boolean;
  unlimited_apps: boolean;
  starts_at: string | null;
  expires_at: string | null;
  lifetime_access: boolean;
  updated_at: string;
};

export type Website = {
  id: string;
  owner_id: string;
  name: string;
  destination_url: string;
  description: string;
  logo_path: string | null;
  developer_name: string;
  contact_information: string;
  category_id: string | null;
  approval_status: "pending" | "approved" | "rejected" | "changes_requested";
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type AndroidApp = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  logo_path: string | null;
  apk_path: string | null;
  external_download_url: string | null;
  google_play_url: string | null;
  developer_name: string;
  version: string;
  package_name: string;
  category_id: string | null;
  approval_status: "pending" | "approved" | "rejected" | "changes_requested";
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

export type MediaItem = {
  id: string;
  title: string;
  description: string;
  media_type: "image" | "video" | "youtube";
  object_path: string | null;
  youtube_url: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      user_permissions: Table<UserPermission>;
      websites: Table<Website>;
      android_apps: Table<AndroidApp>;
      categories: Table<Category>;
      media_items: Table<MediaItem>;
      admin_audit_logs: Table<{
        id: string;
        admin_id: string;
        action: string;
        target_type: string;
        target_id: string | null;
        details: Json;
        created_at: string;
      }>;
      download_events: Table<{
        id: string;
        app_id: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      consume_admin_login_attempt: {
        Args: { p_fingerprint: string };
        Returns: boolean;
      };
      record_admin_login_attempt: {
        Args: { p_fingerprint: string; p_succeeded: boolean };
        Returns: undefined;
      };
      has_active_permission: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
