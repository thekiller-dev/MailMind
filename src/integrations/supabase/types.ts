export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      oauth_states: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          nonce_hash: string;
          origin: string;
          user_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          nonce_hash: string;
          origin: string;
          user_id: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          nonce_hash?: string;
          origin?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sync_runs: {
        Row: {
          account_id: string;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          history_id_end: string | null;
          history_id_start: string | null;
          id: string;
          idempotency_key: string;
          messages_analyzed: number;
          messages_inserted: number;
          messages_listed: number;
          metadata: Json;
          queue_message_id: number | null;
          started_at: string | null;
          status: string;
          trigger: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          history_id_end?: string | null;
          history_id_start?: string | null;
          id?: string;
          idempotency_key: string;
          messages_analyzed?: number;
          messages_inserted?: number;
          messages_listed?: number;
          metadata?: Json;
          queue_message_id?: number | null;
          started_at?: string | null;
          status?: string;
          trigger: string;
          user_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          history_id_end?: string | null;
          history_id_start?: string | null;
          id?: string;
          idempotency_key?: string;
          messages_analyzed?: number;
          messages_inserted?: number;
          messages_listed?: number;
          metadata?: Json;
          queue_message_id?: number | null;
          started_at?: string | null;
          status?: string;
          trigger?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      email_actions: {
        Row: {
          account_id: string | null;
          action: string;
          actor: string;
          created_at: string;
          email_id: string;
          error: string | null;
          id: string;
          idempotency_key: string;
          result: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          action: string;
          actor?: string;
          created_at?: string;
          email_id: string;
          error?: string | null;
          id?: string;
          idempotency_key: string;
          result: string;
          user_id: string;
        };
        Update: {
          account_id?: string | null;
          action?: string;
          actor?: string;
          created_at?: string;
          email_id?: string;
          error?: string | null;
          id?: string;
          idempotency_key?: string;
          result?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          quantity: number;
          source: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          quantity?: number;
          source: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          quantity?: number;
          source?: string;
          user_id?: string;
        };
        Relationships: [];
      };
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
          summary_alerts: boolean;
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
          summary_alerts?: boolean;
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
          summary_alerts?: boolean;
          summary_digest?: boolean;
          updated_at?: string;
          urgent_alerts?: boolean;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      whatsapp_connections: {
        Row: {
          chat_id: string | null;
          command_access: boolean;
          created_at: string;
          display_name: string | null;
          id: string;
          link_token_expires_at: string | null;
          link_token_hash: string | null;
          linked_at: string | null;
          last_seen_at: string | null;
          phone: string | null;
          phishing_alerts: boolean;
          status: string;
          summary_alerts: boolean;
          summary_digest: boolean;
          updated_at: string;
          urgent_alerts: boolean;
          user_id: string;
        };
        Insert: {
          chat_id?: string | null;
          command_access?: boolean;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          last_seen_at?: string | null;
          phone?: string | null;
          phishing_alerts?: boolean;
          status?: string;
          summary_alerts?: boolean;
          summary_digest?: boolean;
          updated_at?: string;
          urgent_alerts?: boolean;
          user_id: string;
        };
        Update: {
          chat_id?: string | null;
          command_access?: boolean;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          last_seen_at?: string | null;
          phone?: string | null;
          phishing_alerts?: boolean;
          status?: string;
          summary_alerts?: boolean;
          summary_digest?: boolean;
          updated_at?: string;
          urgent_alerts?: boolean;
          user_id?: string;
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
      whatsapp_delivery_events: {
        Row: {
          chat_id: string;
          created_at: string;
          event_id: string;
          event_type: string;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          event_id: string;
          event_type: string;
        };
        Update: {
          chat_id?: string;
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
          whatsapp_digest_time: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          settings?: Json;
          telegram_digest_time?: string;
          whatsapp_digest_time?: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          settings?: Json;
          telegram_digest_time?: string;
          whatsapp_digest_time?: string;
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
          emails_analyzed_count: number;
          full_name: string | null;
          id: string;
          plan: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          emails_analyzed_count?: number;
          full_name?: string | null;
          id: string;
          plan?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          emails_analyzed_count?: number;
          full_name?: string | null;
          id?: string;
          plan?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_oauth_state: {
        Args: {
          p_nonce_hash: string;
          p_origin: string;
        };
        Returns: string | null;
      };
      consume_usage_quota: {
        Args: {
          p_daily_limit: number;
          p_event_type: string;
          p_metadata?: Json;
          p_minute_limit: number;
          p_quantity?: number;
          p_source: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_dashboard_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      increment_emails_analyzed_count: {
        Args: {
          p_user_id: string;
          p_delta?: number;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  pgmq_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      archive: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      read: {
        Args: { n: number; queue_name: string; sleep_seconds: number };
        Returns: {
          enqueued_at: string;
          message: Json;
          msg_id: number;
          read_ct: number;
          vt: string;
        }[];
      };
      send: {
        Args: { message: Json; queue_name: string; sleep_seconds?: number };
        Returns: number;
      };
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
