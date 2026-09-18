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
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          details: Json | null
          event: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      customer_service_links: {
        Row: {
          id: string
          is_active: boolean
          label_ar: string
          platform: string
          sort_order: number
          sublabel_ar: string | null
          url: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          label_ar: string
          platform: string
          sort_order?: number
          sublabel_ar?: string | null
          url: string
        }
        Update: {
          id?: string
          is_active?: boolean
          label_ar?: string
          platform?: string
          sort_order?: number
          sublabel_ar?: string | null
          url?: string
        }
        Relationships: []
      }
      daily_login_rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          reward_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reward_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reward_date?: string
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          deposit_address: string
          id: string
          network: Database["public"]["Enums"]["network_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          deposit_address: string
          id?: string
          network: Database["public"]["Enums"]["network_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          deposit_address?: string
          id?: string
          network?: Database["public"]["Enums"]["network_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_funds: {
        Row: {
          accent: string
          code: string
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          min_amount: number
          name_ar: string
          name_en: string
          profit_percent: number
          sort_order: number
          tagline_ar: string | null
        }
        Insert: {
          accent?: string
          code: string
          created_at?: string
          duration_days: number
          id?: string
          is_active?: boolean
          min_amount?: number
          name_ar: string
          name_en: string
          profit_percent: number
          sort_order?: number
          tagline_ar?: string | null
        }
        Update: {
          accent?: string
          code?: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          min_amount?: number
          name_ar?: string
          name_en?: string
          profit_percent?: number
          sort_order?: number
          tagline_ar?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          expected_profit: number
          fund_id: string
          id: string
          matures_at: string
          settled_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["investment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expected_profit: number
          fund_id: string
          id?: string
          matures_at: string
          settled_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expected_profit?: number
          fund_id?: string
          id?: string
          matures_at?: string
          settled_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "investment_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_wheel_configs: {
        Row: {
          accent: string
          icon: string | null
          id: string
          is_active: boolean
          label_ar: string
          prize_type: string
          prize_value: number
          probability: number
          sort_order: number
        }
        Insert: {
          accent?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label_ar: string
          prize_type: string
          prize_value?: number
          probability?: number
          sort_order?: number
        }
        Update: {
          accent?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string
          prize_type?: string
          prize_value?: number
          probability?: number
          sort_order?: number
        }
        Relationships: []
      }
      lucky_wheel_spins: {
        Row: {
          config_id: string | null
          created_at: string
          id: string
          prize_label: string
          prize_value: number
          spin_date: string
          user_id: string
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          id?: string
          prize_label: string
          prize_value?: number
          spin_date?: string
          user_id: string
        }
        Update: {
          config_id?: string | null
          created_at?: string
          id?: string
          prize_label?: string
          prize_value?: number
          spin_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_wheel_spins_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "lucky_wheel_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_ar: string | null
          created_at: string
          id: string
          is_read: boolean
          title_ar: string
          user_id: string | null
        }
        Insert: {
          body_ar?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title_ar: string
          user_id?: string | null
        }
        Update: {
          body_ar?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title_ar?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description_ar: string | null
          is_public: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description_ar?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description_ar?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_blocked: boolean
          phone: string | null
          referral_code: string
          referred_by: string | null
          trial_active: boolean
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
          username: string
          vip_expires_at: string | null
          vip_level: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_blocked?: boolean
          phone?: string | null
          referral_code: string
          referred_by?: string | null
          trial_active?: boolean
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          username: string
          vip_expires_at?: string | null
          vip_level?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_blocked?: boolean
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          trial_active?: boolean
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          username?: string
          vip_expires_at?: string | null
          vip_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          amount: number
          base_amount: number
          created_at: string
          id: string
          level: number
          origin: string
          rate: number
          referrer_id: string
          source_user_id: string
        }
        Insert: {
          amount: number
          base_amount: number
          created_at?: string
          id?: string
          level: number
          origin: string
          rate: number
          referrer_id: string
          source_user_id: string
        }
        Update: {
          amount?: number
          base_amount?: number
          created_at?: string
          id?: string
          level?: number
          origin?: string
          rate?: number
          referrer_id?: string
          source_user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          amount: number
          created_at: string
          description_ar: string | null
          id: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description_ar?: string | null
          id?: string
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description_ar?: string | null
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completion_date: string
          created_at: string
          id: string
          reward: number
          task_id: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completion_date?: string
          created_at?: string
          id?: string
          reward: number
          task_id: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completion_date?: string
          created_at?: string
          id?: string
          reward?: number
          task_id?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description_ar: string | null
          duration_seconds: number
          id: string
          is_active: boolean
          sort_order: number
          thumbnail_url: string | null
          title_ar: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          duration_seconds?: number
          id?: string
          is_active?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title_ar: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          duration_seconds?: number
          id?: string
          is_active?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title_ar?: string
          video_url?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_vip: {
        Row: {
          expires_at: string
          id: string
          is_active: boolean
          level: number
          package_id: string
          price_paid: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          is_active?: boolean
          level: number
          package_id: string
          price_paid: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          is_active?: boolean
          level?: number
          package_id?: string
          price_paid?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vip_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "vip_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_packages: {
        Row: {
          accent: string
          created_at: string
          daily_profit: number
          daily_tasks: number
          duration_days: number
          id: string
          is_active: boolean
          level: number
          name: string
          price: number
          task_reward: number
        }
        Insert: {
          accent?: string
          created_at?: string
          daily_profit: number
          daily_tasks: number
          duration_days?: number
          id?: string
          is_active?: boolean
          level: number
          name: string
          price: number
          task_reward: number
        }
        Update: {
          accent?: string
          created_at?: string
          daily_profit?: number
          daily_tasks?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          price?: number
          task_reward?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          invested_balance: number
          team_income: number
          total_deposited: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          invested_balance?: number
          team_income?: number
          total_deposited?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          invested_balance?: number
          team_income?: number
          total_deposited?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          locked: boolean
          network: Database["public"]["Enums"]["network_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          locked?: boolean
          network: Database["public"]["Enums"]["network_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          locked?: boolean
          network?: Database["public"]["Enums"]["network_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          admin_note: string | null
          amount: number
          created_at: string
          fee: number
          id: string
          net_amount: number
          network: Database["public"]["Enums"]["network_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          amount: number
          created_at?: string
          fee?: number
          id?: string
          net_amount: number
          network: Database["public"]["Enums"]["network_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          net_amount?: number
          network?: Database["public"]["Enums"]["network_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_balance_change: {
        Args: {
          _amount: number
          _description?: string
          _reference_id?: string
          _type: Database["public"]["Enums"]["tx_type"]
          _user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      investment_status: "active" | "completed" | "cancelled"
      network_type: "ERC20" | "BEP20" | "TRC20"
      request_status: "pending" | "approved" | "rejected"
      tx_status: "pending" | "completed" | "failed" | "cancelled"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "withdrawal_fee"
        | "withdrawal_refund"
        | "investment"
        | "investment_return"
        | "vip_purchase"
        | "task_reward"
        | "lucky_wheel_reward"
        | "referral_commission"
        | "daily_login_reward"
        | "admin_adjustment"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      investment_status: ["active", "completed", "cancelled"],
      network_type: ["ERC20", "BEP20", "TRC20"],
      request_status: ["pending", "approved", "rejected"],
      tx_status: ["pending", "completed", "failed", "cancelled"],
      tx_type: [
        "deposit",
        "withdrawal",
        "withdrawal_fee",
        "withdrawal_refund",
        "investment",
        "investment_return",
        "vip_purchase",
        "task_reward",
        "lucky_wheel_reward",
        "referral_commission",
        "daily_login_reward",
        "admin_adjustment",
      ],
    },
  },
} as const
