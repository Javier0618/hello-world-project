export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      episodes: {
        Row: {
          created_at: string | null
          episode_number: number
          id: string
          name: string | null
          season_id: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          episode_number: number
          id?: string
          name?: string | null
          season_id: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          episode_number?: number
          id?: string
          name?: string | null
          season_id?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      movies_imported: {
        Row: {
          backdrop_path: string | null
          category: string | null
          created_at: string | null
          id: number
          imported_by: string
          overview: string | null
          poster_path: string | null
          release_date: string | null
          title: string
          tmdb_id: number
          updated_at: string | null
          video_url: string
          vote_average: number | null
        }
        Insert: {
          backdrop_path?: string | null
          category?: string | null
          created_at?: string | null
          id: number
          imported_by: string
          overview?: string | null
          poster_path?: string | null
          release_date?: string | null
          title: string
          tmdb_id: number
          updated_at?: string | null
          video_url: string
          vote_average?: number | null
        }
        Update: {
          backdrop_path?: string | null
          category?: string | null
          created_at?: string | null
          id?: number
          imported_by?: string
          overview?: string | null
          poster_path?: string | null
          release_date?: string | null
          title?: string
          tmdb_id?: number
          updated_at?: string | null
          video_url?: string
          vote_average?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          id: string
          user_id: string
          item_id: number
          item_type: string
          tmdb_id: number
          title: string
          poster_path: string | null
          vote_average: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: number
          item_type: string
          tmdb_id: number
          title: string
          poster_path?: string | null
          vote_average?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: number
          item_type?: string
          tmdb_id?: number
          title?: string
          poster_path?: string | null
          vote_average?: number
          created_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          episode_count: number | null
          id: string
          name: string | null
          season_number: number
          tv_show_id: number
        }
        Insert: {
          created_at?: string | null
          episode_count?: number | null
          id?: string
          name?: string | null
          season_number: number
          tv_show_id: number
        }
        Update: {
          created_at?: string | null
          episode_count?: number | null
          id?: string
          name?: string | null
          season_number?: number
          tv_show_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_tv_show_id_fkey"
            columns: ["tv_show_id"]
            isOneToOne: false
            referencedRelation: "tv_shows_imported"
            referencedColumns: ["id"]
          },
        ]
      }
      section_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: number
          item_type: string
          position: number
          section_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: number
          item_type: string
          position?: number
          section_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: number
          item_type?: string
          position?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          category: string | null
          content_type: string | null
          created_at: string | null
          id: string
          internal_tab: string | null
          name: string
          placement: string | null
          position: number
          screen_visibility: string | null
          type: string
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: string
          internal_tab?: string | null
          name: string
          placement?: string | null
          position?: number
          screen_visibility?: string | null
          type: string
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: string
          internal_tab?: string | null
          name?: string
          placement?: string | null
          position?: number
          screen_visibility?: string | null
          type?: string
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      tv_shows_imported: {
        Row: {
          backdrop_path: string | null
          category: string | null
          created_at: string | null
          first_air_date: string | null
          id: number
          imported_by: string
          name: string
          number_of_seasons: number | null
          overview: string | null
          poster_path: string | null
          tmdb_id: number
          updated_at: string | null
          vote_average: number | null
        }
        Insert: {
          backdrop_path?: string | null
          category?: string | null
          created_at?: string | null
          first_air_date?: string | null
          id: number
          imported_by: string
          name: string
          number_of_seasons?: number | null
          overview?: string | null
          poster_path?: string | null
          tmdb_id: number
          updated_at?: string | null
          vote_average?: number | null
        }
        Update: {
          backdrop_path?: string | null
          category?: string | null
          created_at?: string | null
          first_air_date?: string | null
          id?: number
          imported_by?: string
          name?: string
          number_of_seasons?: number | null
          overview?: string | null
          poster_path?: string | null
          tmdb_id?: number
          updated_at?: string | null
          vote_average?: number | null
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      watch_history: {
        Row: {
          id: string
          user_id: string
          item_id: number
          item_type: string
          title: string
          poster_path: string | null
          vote_average: number
          watched_at: string
          time_spent: number
        }
        Insert: {
          id?: string
          user_id: string
          item_id: number
          item_type: string
          title: string
          poster_path?: string | null
          vote_average?: number
          watched_at?: string
          time_spent?: number
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: number
          item_type?: string
          title?: string
          poster_path?: string | null
          vote_average?: number
          watched_at?: string
          time_spent?: number
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          user_id: string
          query: string
          searched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          searched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          searched_at?: string
        }
        Relationships: []
      }
      popular_searches: {
        Row: {
          id: string
          query: string
          search_count: number
          last_searched_at: string
        }
        Insert: {
          id?: string
          query: string
          search_count?: number
          last_searched_at?: string
        }
        Update: {
          id?: string
          query?: string
          search_count?: number
          last_searched_at?: string
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
