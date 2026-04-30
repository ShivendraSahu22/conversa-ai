export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          level: string
          owner_id: string | null
          payload: Json
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          level?: string
          owner_id?: string | null
          payload?: Json
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          level?: string
          owner_id?: string | null
          payload?: Json
        }
        Relationships: []
      }
      agent_personality: {
        Row: {
          agent_name: string
          created_at: string
          default_tone: string
          enabled: boolean
          id: string
          languages: string[]
          owner_id: string
          system_prompt: string
          typing_delay_max_ms: number
          typing_delay_ms_per_char: number
          updated_at: string
        }
        Insert: {
          agent_name?: string
          created_at?: string
          default_tone?: string
          enabled?: boolean
          id?: string
          languages?: string[]
          owner_id: string
          system_prompt?: string
          typing_delay_max_ms?: number
          typing_delay_ms_per_char?: number
          updated_at?: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          default_tone?: string
          enabled?: boolean
          id?: string
          languages?: string[]
          owner_id?: string
          system_prompt?: string
          typing_delay_max_ms?: number
          typing_delay_ms_per_char?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          analyzer_output: Json | null
          communicator_output: Json | null
          conversation_id: string
          created_at: string
          error: string | null
          id: string
          inbound_message_id: string | null
          memory_output: Json | null
          outbound_message_id: string | null
          owner_id: string
          planner_output: Json | null
          total_latency_ms: number | null
        }
        Insert: {
          analyzer_output?: Json | null
          communicator_output?: Json | null
          conversation_id: string
          created_at?: string
          error?: string | null
          id?: string
          inbound_message_id?: string | null
          memory_output?: Json | null
          outbound_message_id?: string | null
          owner_id: string
          planner_output?: Json | null
          total_latency_ms?: number | null
        }
        Update: {
          analyzer_output?: Json | null
          communicator_output?: Json | null
          conversation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          inbound_message_id?: string | null
          memory_output?: Json | null
          outbound_message_id?: string | null
          owner_id?: string
          planner_output?: Json | null
          total_latency_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_inbound_message_id_fkey"
            columns: ["inbound_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_outbound_message_id_fkey"
            columns: ["outbound_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          owner_id: string
          platform: Database["public"]["Enums"]["platform_kind"]
          platform_account_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id: string
          platform: Database["public"]["Enums"]["platform_kind"]
          platform_account_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["platform_kind"]
          platform_account_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      long_term_memory: {
        Row: {
          created_at: string
          id: string
          importance: number
          key: string
          owner_id: string
          platform_account_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          importance?: number
          key: string
          owner_id: string
          platform_account_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          importance?: number
          key?: string
          owner_id?: string
          platform_account_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "long_term_memory_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_overrides: {
        Row: {
          admin_user_id: string
          conversation_id: string
          created_at: string
          id: string
          message_id: string | null
          owner_id: string
        }
        Insert: {
          admin_user_id: string
          conversation_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          owner_id: string
        }
        Update: {
          admin_user_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_overrides_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_overrides_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          detected_language: string | null
          emotion: string | null
          id: string
          is_manual_override: boolean
          metadata: Json
          owner_id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          detected_language?: string | null
          emotion?: string | null
          id?: string
          is_manual_override?: boolean
          metadata?: Json
          owner_id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          detected_language?: string | null
          emotion?: string | null
          id?: string
          is_manual_override?: boolean
          metadata?: Json
          owner_id?: string
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_accounts: {
        Row: {
          created_at: string
          display_name: string | null
          external_id: string
          id: string
          metadata: Json
          owner_id: string
          platform: Database["public"]["Enums"]["platform_kind"]
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          external_id: string
          id?: string
          metadata?: Json
          owner_id: string
          platform: Database["public"]["Enums"]["platform_kind"]
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          external_id?: string
          id?: string
          metadata?: Json
          owner_id?: string
          platform?: Database["public"]["Enums"]["platform_kind"]
          username?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      message_role: "user" | "assistant" | "system"
      platform_kind: "telegram" | "whatsapp" | "twitter"
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
      app_role: ["admin", "user"],
      message_role: ["user", "assistant", "system"],
      platform_kind: ["telegram", "whatsapp", "twitter"],
    },
  },
} as const
