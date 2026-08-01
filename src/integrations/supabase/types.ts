export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      telegram_connections: {
        Row: {
          chat_id: number | null;
          command_access: boolean;
          created_at: string;
          first_name: string | null;
          id: string;
          link_token_expires_at: string | null;
          link_token_hash: string | null;
          linked_at: string | null;
          last_seen_at: string | null;
          phishing_alerts: boolean;
          status: string;
          summary_digest: boolean;
          updated_at: string;
          urgent_alerts: boolean;
          user_id: string;
          username: string | null;
        };
        Insert: {
          chat_id?: number | null;
          command_access?: boolean;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          last_seen_at?: string | null;
          phishing_alerts?: boolean;
          status?: string;
          summary_digest?: boolean;
          updated_at?: string;
          urgent_alerts?: boolean;
          user_id: string;
          username?: string | null;
        };
        Update: {
          chat_id?: number | null;
          command_access?: boolean;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          last_seen_at?: string | null;
          phishing_alerts?: boolean;
          status?: string;
          summary_digest?: boolean;
          updated_at?: string;
          urgent_alerts?: boolean;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      telegram_delivery_events: {
        Row: {
          chat_id: number;
          created_at: string;
          event_id: string;
          event_type: string;
        };
        Insert: {
          chat_id: number;
          created_at?: string;
          event_id: string;
          event_type: string;
        };
        Update: {
          chat_id?: number;
          created_at?: string;
          event_id?: string;
          event_type?: string;
        };
        Relationships: [];
      };
      risc_security_events: {
        Row: {
          event_types: string[];
          handled_at: string | null;
          jti: string;
          received_at: string;
          subject_sub: string | null;
        };
        Insert: {
          event_types?: string[];
          handled_at?: string | null;
          jti: string;
          received_at?: string;
          subject_sub?: string | null;
        };
        Update: {
          event_types?: string[];
          handled_at?: string | null;
          jti?: string;
          received_at?: string;
          subject_sub?: string | null;
        };
        Relationships: [];
      };
      email_accounts: {
        Row: {
          access_token: string | null;
          created_at: string;
          display_name: string | null;
          email: string;
          error: string | null;
          forwarding_confirmation_code: string | null;
          forwarding_confirmation_url: string | null;
          history_id: string | null;
          id: string;
          inbound_alias: string | null;
          last_forwarded_at: string | null;
          last_synced_at: string | null;
          provider: string;
          provider_account_id: string | null;
          refresh_token: string | null;
          scopes: string | null;
          status: string;
          token_expires_at: string | null;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          created_at?: string;
          display_name?: string | null;
          email: string;
          error?: string | null;
          forwarding_confirmation_code?: string | null;
          forwarding_confirmation_url?: string | null;
          history_id?: string | null;
          id?: string;
          inbound_alias?: string | null;
          last_forwarded_at?: string | null;
          last_synced_at?: string | null;
          provider: string;
          provider_account_id?: string | null;
          refresh_token?: string | null;
          scopes?: string | null;
          status?: string;
          token_expires_at?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string;
          error?: string | null;
          forwarding_confirmation_code?: string | null;
          forwarding_confirmation_url?: string | null;
          history_id?: string | null;
          id?: string;
          inbound_alias?: string | null;
          last_forwarded_at?: string | null;
          last_synced_at?: string | null;
          provider?: string;
          provider_account_id?: string | null;
          refresh_token?: string | null;
          scopes?: string | null;
          status?: string;
          token_expires_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      emails: {
        Row: {
          account_id: string | null;
          analyzed_at: string | null;
          archived_at: string | null;
          body: string | null;
          category: string | null;
          created_at: string;
          entities: Json | null;
          id: string;
          intent: string | null;
          provider_message_id: string | null;
          received_at: string;
          reported_at: string | null;
          risk_score: number | null;
          risk_reason: string | null;
          sender: string;
          sentiment: string | null;
          snippet: string | null;
          subject: string;
          summary: string | null;
          thread_id: string | null;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          analyzed_at?: string | null;
          archived_at?: string | null;
          body?: string | null;
          category?: string | null;
          created_at?: string;
          entities?: Json | null;
          id?: string;
          intent?: string | null;
          provider_message_id?: string | null;
          received_at?: string;
          reported_at?: string | null;
          risk_score?: number | null;
          risk_reason?: string | null;
          sender: string;
          sentiment?: string | null;
          snippet?: string | null;
          subject: string;
          summary?: string | null;
          thread_id?: string | null;
          user_id: string;
        };
        Update: {
          account_id?: string | null;
          analyzed_at?: string | null;
          archived_at?: string | null;
          body?: string | null;
          category?: string | null;
          created_at?: string;
          entities?: Json | null;
          id?: string;
          intent?: string | null;
          provider_message_id?: string | null;
          received_at?: string;
          reported_at?: string | null;
          risk_score?: number | null;
          risk_reason?: string | null;
          sender?: string;
          sentiment?: string | null;
          snippet?: string | null;
          subject?: string;
          summary?: string | null;
          thread_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emails_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "email_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          settings: Json;
          telegram_digest_time: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          settings?: Json;
          telegram_digest_time?: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          settings?: Json;
          telegram_digest_time?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
