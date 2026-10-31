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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      episodes: {
        Row: {
          author: string | null
          cover_path: string | null
          description: string | null
          duration_minutes: number | null
          number: number
          release_date: string | null
          title: string
        }
        Insert: {
          author?: string | null
          cover_path?: string | null
          description?: string | null
          duration_minutes?: number | null
          number: number
          release_date?: string | null
          title: string
        }
        Update: {
          author?: string | null
          cover_path?: string | null
          description?: string | null
          duration_minutes?: number | null
          number?: number
          release_date?: string | null
          title?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          episode_number: number
          position: number
          user_id: string
        }
        Insert: {
          episode_number: number
          position: number
          user_id: string
        }
        Update: {
          episode_number?: number
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_episode_number_fkey"
            columns: ["episode_number"]
            isOneToOne: false
            referencedRelation: "episode_stats"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "favorites_episode_number_fkey"
            columns: ["episode_number"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string
          episode_number: number
          id: string
          is_relisten: boolean
          liked: boolean
          listened_on: string
          rating: number | null
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_number: number
          id?: string
          is_relisten?: boolean
          liked?: boolean
          listened_on?: string
          rating?: number | null
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          episode_number?: number
          id?: string
          is_relisten?: boolean
          liked?: boolean
          listened_on?: string
          rating?: number | null
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_episode_number_fkey"
            columns: ["episode_number"]
            isOneToOne: false
            referencedRelation: "episode_stats"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "logs_episode_number_fkey"
            columns: ["episode_number"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          episode_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          episode_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_episode_number_fkey"
            columns: ["episode_number"]
            isOneToOne: false
            referencedRelation: "episode_stats"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "watchlist_episode_number_fkey"
            columns: ["episode_number"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      episode_stats: {
        Row: {
          avg_rating: number | null
          like_count: number | null
          log_count: number | null
          number: number | null
          rating_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
