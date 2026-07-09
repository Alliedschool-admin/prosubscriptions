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
      orders: {
        Row: {
          admin_note: string | null
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          delivered_content: string | null
          id: string
          item_id: string
          item_kind: string
          item_name: string
          payment_method_id: string | null
          payment_method_label: string | null
          proof_path: string | null
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          sender_contact: string
          sender_name: string
          status: Database["public"]["Enums"]["order_status"]
          stock_item_id: string | null
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          delivered_content?: string | null
          id?: string
          item_id: string
          item_kind: string
          item_name: string
          payment_method_id?: string | null
          payment_method_label?: string | null
          proof_path?: string | null
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_contact: string
          sender_name: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_item_id?: string | null
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          delivered_content?: string | null
          id?: string
          item_id?: string
          item_kind?: string
          item_name?: string
          payment_method_id?: string | null
          payment_method_label?: string | null
          proof_path?: string | null
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_contact?: string
          sender_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_item_id?: string | null
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "product_stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_name: string | null
          account_number: string
          active: boolean
          created_at: string
          currency: string
          id: string
          instructions: string | null
          kind: Database["public"]["Enums"]["payment_method_kind"]
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          instructions?: string | null
          kind: Database["public"]["Enums"]["payment_method_kind"]
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          instructions?: string | null
          kind?: Database["public"]["Enums"]["payment_method_kind"]
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_requests: {
        Row: {
          admin_response: string | null
          contact: string | null
          created_at: string
          details: string | null
          id: string
          product_name: string
          reference_link: string | null
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["product_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          contact?: string | null
          created_at?: string
          details?: string | null
          id?: string
          product_name: string
          reference_link?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["product_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          contact?: string | null
          created_at?: string
          details?: string | null
          id?: string
          product_name?: string
          reference_link?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["product_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_stock_items: {
        Row: {
          assigned_order_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          sold_at: string | null
          status: Database["public"]["Enums"]["stock_status"]
        }
        Insert: {
          assigned_order_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["stock_status"]
        }
        Update: {
          assigned_order_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["stock_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_items_assigned_order_id_fkey"
            columns: ["assigned_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_stock: number
          category: string
          code: string
          cost_pkr: number | null
          cost_usd: number | null
          created_at: string
          created_by: string | null
          delivery_instructions: string | null
          description: string
          features: Json
          id: string
          image: string
          name: string
          price: number
          price_pkr: number | null
          price_usd: number | null
          tagline: string
          updated_at: string
        }
        Insert: {
          available_stock?: number
          category: string
          code: string
          cost_pkr?: number | null
          cost_usd?: number | null
          created_at?: string
          created_by?: string | null
          delivery_instructions?: string | null
          description: string
          features?: Json
          id: string
          image: string
          name: string
          price: number
          price_pkr?: number | null
          price_usd?: number | null
          tagline: string
          updated_at?: string
        }
        Update: {
          available_stock?: number
          category?: string
          code?: string
          cost_pkr?: number | null
          cost_usd?: number | null
          created_at?: string
          created_by?: string | null
          delivery_instructions?: string | null
          description?: string
          features?: Json
          id?: string
          image?: string
          name?: string
          price?: number
          price_pkr?: number | null
          price_usd?: number | null
          tagline?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_order: {
        Args: { _note?: string; _order_id: string }
        Returns: {
          delivered: boolean
          order_id: string
          out_of_stock: boolean
        }[]
      }
      claim_first_admin: { Args: never; Returns: boolean }
      grant_admin_by_email: {
        Args: { _email: string }
        Returns: {
          email: string
          granted: boolean
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_admins: {
        Args: never
        Returns: {
          email: string
          granted_at: string
          user_id: string
        }[]
      }
      list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_admin: boolean
          last_sign_in_at: string
          order_count: number
          phone: string
          provider: string
          total_spent: number
          user_id: string
        }[]
      }
      refresh_product_stock_count: {
        Args: { _product_id: string }
        Returns: undefined
      }
      revoke_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "pending" | "approved" | "rejected"
      payment_method_kind:
        | "jazzcash"
        | "easypaisa"
        | "nayapay"
        | "sadapay"
        | "bank"
        | "binance_pay"
        | "crypto"
        | "other"
      product_request_status:
        | "new"
        | "in_review"
        | "responded"
        | "fulfilled"
        | "declined"
      stock_status: "available" | "sold"
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
      order_status: ["pending", "approved", "rejected"],
      payment_method_kind: [
        "jazzcash",
        "easypaisa",
        "nayapay",
        "sadapay",
        "bank",
        "binance_pay",
        "crypto",
        "other",
      ],
      product_request_status: [
        "new",
        "in_review",
        "responded",
        "fulfilled",
        "declined",
      ],
      stock_status: ["available", "sold"],
    },
  },
} as const
