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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          amount: number | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          method: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          amount?: number | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          method?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          amount?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          method?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_bots: {
        Row: {
          created_at: string
          daily_return_rate: number
          description: string | null
          id: string
          is_active: boolean | null
          minimum_investment: number
          name: string
          risk_level: string | null
          strategy: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_return_rate: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_investment?: number
          name: string
          risk_level?: string | null
          strategy?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_return_rate?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_investment?: number
          name?: string
          risk_level?: string | null
          strategy?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_investments: {
        Row: {
          accumulated_returns: number | null
          bot_id: string
          completed_at: string | null
          created_at: string
          daily_return_rate: number
          end_date: string
          id: string
          initial_amount: number
          locked_amount: number
          start_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_returns?: number | null
          bot_id: string
          completed_at?: string | null
          created_at?: string
          daily_return_rate: number
          end_date: string
          id?: string
          initial_amount: number
          locked_amount: number
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_returns?: number | null
          bot_id?: string
          completed_at?: string | null
          created_at?: string
          daily_return_rate?: number
          end_date?: string
          id?: string
          initial_amount?: number
          locked_amount?: number
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_investments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "ai_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_returns: {
        Row: {
          allocation_id: string | null
          bot_id: string
          created_at: string
          cumulative_return: number
          daily_return: number
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_id?: string | null
          bot_id: string
          created_at?: string
          cumulative_return?: number
          daily_return?: number
          date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_id?: string | null
          bot_id?: string
          created_at?: string
          cumulative_return?: number
          daily_return?: number
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_returns_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "bot_investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_returns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "ai_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          id: string
          method: string
          screenshot_url: string | null
          status: string
          transaction_reference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          id?: string
          method: string
          screenshot_url?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          screenshot_url?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          requested_changes: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          requested_changes: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          requested_changes?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          kyc_status: string | null
          kyc_submitted_at: string | null
          name: string | null
          phone: string | null
          selfie_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          kyc_status?: string | null
          kyc_submitted_at?: string | null
          name?: string | null
          phone?: string | null
          selfie_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          kyc_status?: string | null
          kyc_submitted_at?: string | null
          name?: string | null
          phone?: string | null
          selfie_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          allocation_id: string | null
          amount: number
          bot_id: string | null
          created_at: string | null
          id: string
          method: string | null
          notes: string | null
          processed_at: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          allocation_id?: string | null
          amount: number
          bot_id?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          processed_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          allocation_id?: string | null
          amount?: number
          bot_id?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          processed_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "ai_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          id: string
          locked_balance: number
          returns_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          id?: string
          locked_balance?: number
          returns_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          id?: string
          locked_balance?: number
          returns_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          id: string
          method: string
          status: string
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          id?: string
          method: string
          status?: string
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_expired_investment: {
        Args: {
          p_locked_amount: number
          p_returns_amount: number
          p_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_returns_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
