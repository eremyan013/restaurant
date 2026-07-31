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
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          admin_name: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          activity_log: string | null
          admin_id: string
          concierge: string | null
          created_at: string
          guides: string | null
          menus: string | null
          prizes: string | null
          redemption: string | null
          reservations: string | null
          reviews: string | null
          updated_at: string
          users: string | null
          venues: string | null
          yel: string | null
        }
        Insert: {
          activity_log?: string | null
          admin_id: string
          concierge?: string | null
          created_at?: string
          guides?: string | null
          menus?: string | null
          prizes?: string | null
          redemption?: string | null
          reservations?: string | null
          reviews?: string | null
          updated_at?: string
          users?: string | null
          venues?: string | null
          yel?: string | null
        }
        Update: {
          activity_log?: string | null
          admin_id?: string
          concierge?: string | null
          created_at?: string
          guides?: string | null
          menus?: string | null
          prizes?: string | null
          redemption?: string | null
          reservations?: string | null
          reviews?: string | null
          updated_at?: string
          users?: string | null
          venues?: string | null
          yel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_messages: {
        Row: {
          created_at: string | null
          id: string
          role: string
          session_id: string
          suggestions: Json | null
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          suggestions?: Json | null
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          suggestions?: Json | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_sessions: {
        Row: {
          id: string
          last_message_at: string | null
          started_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          id?: string
          last_message_at?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          last_message_at?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          count: number
          cover_url: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          subtitle: string
          subtitle_en: string | null
          subtitle_hy: string | null
          subtitle_ru: string | null
          tag: string
          tag_en: string | null
          tag_hy: string | null
          tag_ru: string | null
          title: string
          title_en: string | null
          title_hy: string | null
          title_ru: string | null
          updated_at: string
          venue_ids: string[]
        }
        Insert: {
          count?: number
          cover_url: string
          created_at?: string
          id: string
          is_active?: boolean
          sort_order?: number
          subtitle: string
          subtitle_en?: string | null
          subtitle_hy?: string | null
          subtitle_ru?: string | null
          tag: string
          tag_en?: string | null
          tag_hy?: string | null
          tag_ru?: string | null
          title: string
          title_en?: string | null
          title_hy?: string | null
          title_ru?: string | null
          updated_at?: string
          venue_ids?: string[]
        }
        Update: {
          count?: number
          cover_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string
          subtitle_en?: string | null
          subtitle_hy?: string | null
          subtitle_ru?: string | null
          tag?: string
          tag_en?: string | null
          tag_hy?: string | null
          tag_ru?: string | null
          title?: string
          title_en?: string | null
          title_hy?: string | null
          title_ru?: string | null
          updated_at?: string
          venue_ids?: string[]
        }
        Relationships: []
      }
      home_section_items: {
        Row: {
          created_at: string
          guide_id: string | null
          id: string
          item_type: string
          section_id: string
          sort_order: number
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          guide_id?: string | null
          id?: string
          item_type: string
          section_id: string
          sort_order?: number
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          guide_id?: string | null
          id?: string
          item_type?: string
          section_id?: string
          sort_order?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_section_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          created_at: string
          eyebrow: string
          eyebrow_en: string | null
          eyebrow_hy: string | null
          eyebrow_ru: string | null
          id: string
          is_active: boolean
          is_builtin: boolean
          name: string
          name_en: string | null
          name_hy: string | null
          name_ru: string | null
          section_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          eyebrow?: string
          eyebrow_en?: string | null
          eyebrow_hy?: string | null
          eyebrow_ru?: string | null
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          name: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          section_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          eyebrow?: string
          eyebrow_en?: string | null
          eyebrow_hy?: string | null
          eyebrow_ru?: string | null
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          name?: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          section_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          name_en: string | null
          name_hy: string | null
          name_ru: string | null
          sort_order: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          sort_order?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          sort_order?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[]
          allergens_en: string[] | null
          allergens_hy: string[] | null
          allergens_ru: string[] | null
          category_id: string
          created_at: string
          description: string | null
          description_en: string | null
          description_hy: string | null
          description_ru: string | null
          id: string
          is_available: boolean
          is_popular: boolean
          name: string
          name_en: string | null
          name_hy: string | null
          name_ru: string | null
          photo_url: string | null
          price: number
          sort_order: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          allergens?: string[]
          allergens_en?: string[] | null
          allergens_hy?: string[] | null
          allergens_ru?: string[] | null
          category_id: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          description_ru?: string | null
          id?: string
          is_available?: boolean
          is_popular?: boolean
          name: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          photo_url?: string | null
          price: number
          sort_order?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          allergens?: string[]
          allergens_en?: string[] | null
          allergens_hy?: string[] | null
          allergens_ru?: string[] | null
          category_id?: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          description_ru?: string | null
          id?: string
          is_available?: boolean
          is_popular?: boolean
          name?: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          photo_url?: string | null
          price?: number
          sort_order?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      occasions: {
        Row: {
          id: string
          name_hy: string
          name_ru: string
          name_en: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name_hy: string
          name_ru: string
          name_en: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name_hy?: string
          name_ru?: string
          name_en?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          id:          string
          image_url:   string
          title:       string | null
          subtitle:    string | null
          tap_action:  'none' | 'deep_link' | 'external_url'
          tap_url:     string | null
          is_active:   boolean
          sort_order:  number
          start_date:  string | null
          end_date:    string | null
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:         string
          image_url:   string
          title?:      string | null
          subtitle?:   string | null
          tap_action?: 'none' | 'deep_link' | 'external_url'
          tap_url?:    string | null
          is_active?:  boolean
          sort_order?: number
          start_date?: string | null
          end_date?:   string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id:          string
          image_url:   string
          title:       string | null
          subtitle:    string | null
          tap_action:  'none' | 'deep_link' | 'external_url'
          tap_url:     string | null
          is_active:   boolean
          sort_order:  number
          start_date:  string | null
          end_date:    string | null
          created_at:  string
          updated_at:  string
        }>
        Relationships: []
      }
      prizes: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_tier_level: number | null
          name: string
          points_cost: number | null
          sort_order: number | null
          stock: number | null
          type: string
          unlock_type: string
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_tier_level?: number | null
          name: string
          points_cost?: number | null
          sort_order?: number | null
          stock?: number | null
          type: string
          unlock_type: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_tier_level?: number | null
          name?: string
          points_cost?: number | null
          sort_order?: number | null
          stock?: number | null
          type?: string
          unlock_type?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          id: string
          is_admin: boolean
          language: string
          managed_venue_id: string | null
          managed_venue_ids: string[] | null
          name: string
          phone: string | null
          phone_verified: boolean
          player_id: number
          push_token: string | null
          role: string
          surname: string | null
          tier: string
          tier_level: number
          total_visits: number
          updated_at: string
          web_push_sub: Json | null
          yel_points: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          id: string
          is_admin?: boolean
          language?: string
          managed_venue_id?: string | null
          managed_venue_ids?: string[] | null
          name?: string
          phone?: string | null
          phone_verified?: boolean
          player_id?: number
          push_token?: string | null
          role?: string
          surname?: string | null
          tier?: string
          tier_level?: number
          total_visits?: number
          updated_at?: string
          web_push_sub?: Json | null
          yel_points?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          id?: string
          is_admin?: boolean
          language?: string
          managed_venue_id?: string | null
          managed_venue_ids?: string[] | null
          name?: string
          phone?: string | null
          phone_verified?: boolean
          player_id?: number
          push_token?: string | null
          role?: string
          surname?: string | null
          tier?: string
          tier_level?: number
          total_visits?: number
          updated_at?: string
          web_push_sub?: Json | null
          yel_points?: number
        }
        Relationships: []
      }
      reservations: {
        Row: {
          admin_note: string | null
          created_at: string
          date: string
          date_iso: string | null
          id: string
          note: string | null
          occasion: string | null
          people: number
          status: string
          time: string
          updated_at: string
          user_id: string
          venue_id: string
          yel_earned: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          date: string
          date_iso?: string | null
          id?: string
          note?: string | null
          occasion?: string | null
          people: number
          status?: string
          time: string
          updated_at?: string
          user_id: string
          venue_id: string
          yel_earned?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          date?: string
          date_iso?: string | null
          id?: string
          note?: string | null
          occasion?: string | null
          people?: number
          status?: string
          time?: string
          updated_at?: string
          user_id?: string
          venue_id?: string
          yel_earned?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean
          rating: number
          reservation_id: string
          status: string
          user_id: string
          venue_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean
          rating: number
          reservation_id: string
          status?: string
          user_id: string
          venue_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean
          rating?: number
          reservation_id?: string
          status?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_prizes: {
        Row: {
          claimed_at: string | null
          code: string | null
          expires_at: string | null
          id: string
          prize_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          code?: string | null
          expires_at?: string | null
          id?: string
          prize_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          code?: string | null
          expires_at?: string | null
          id?: string
          prize_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prizes_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_prizes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_blocked_dates: {
        Row: {
          created_at: string | null
          date: string
          id: string
          reason: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          reason?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          reason?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_blocked_dates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string | null
          venue_id: string
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string | null
          venue_id: string
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          id: string
          name_hy: string
          name_ru: string
          name_en: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_hy: string
          name_ru: string
          name_en: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_hy?: string
          name_ru?: string
          name_en?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          area: string
          area_en: string | null
          area_hy: string | null
          area_ru: string | null
          booked_today: number
          coord_x: number
          coord_y: number
          created_at: string
          cuisine: string
          cuisine_en: string | null
          cuisine_hy: string | null
          cuisine_ru: string | null
          description: string
          description_en: string | null
          description_hy: string | null
          description_ru: string | null
          dish_url: string
          distance_km: string
          heat: string
          id: string
          is_active: boolean
          kind: string
          location_id: string | null
          name: string
          name_en: string | null
          name_hy: string | null
          name_ru: string | null
          perk: string
          perk_en: string | null
          perk_hy: string | null
          perk_ru: string | null
          photo_url: string
          price: string
          rating: number
          reviews_count: number
          tags: string[]
          tags_en: string[] | null
          tags_hy: string[] | null
          tags_ru: string[] | null
          time_yel_map: Json | null
          times: string[]
          updated_at: string
        }
        Insert: {
          area: string
          area_en?: string | null
          area_hy?: string | null
          area_ru?: string | null
          booked_today?: number
          coord_x: number
          coord_y: number
          created_at?: string
          cuisine: string
          cuisine_en?: string | null
          cuisine_hy?: string | null
          cuisine_ru?: string | null
          description: string
          description_en?: string | null
          description_hy?: string | null
          description_ru?: string | null
          dish_url: string
          distance_km: string
          heat: string
          id: string
          is_active?: boolean
          kind: string
          location_id?: string | null
          name: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          perk?: string
          perk_en?: string | null
          perk_hy?: string | null
          perk_ru?: string | null
          photo_url: string
          price: string
          rating?: number
          reviews_count?: number
          tags?: string[]
          tags_en?: string[] | null
          tags_hy?: string[] | null
          tags_ru?: string[] | null
          time_yel_map?: Json | null
          times?: string[]
          updated_at?: string
        }
        Update: {
          area?: string
          area_en?: string | null
          area_hy?: string | null
          area_ru?: string | null
          booked_today?: number
          coord_x?: number
          coord_y?: number
          created_at?: string
          cuisine?: string
          cuisine_en?: string | null
          cuisine_hy?: string | null
          cuisine_ru?: string | null
          description?: string
          description_en?: string | null
          description_hy?: string | null
          description_ru?: string | null
          dish_url?: string
          distance_km?: string
          heat?: string
          id?: string
          is_active?: boolean
          kind?: string
          location_id?: string | null
          name?: string
          name_en?: string | null
          name_hy?: string | null
          name_ru?: string | null
          perk?: string
          perk_en?: string | null
          perk_hy?: string | null
          perk_ru?: string | null
          photo_url?: string
          price?: string
          rating?: number
          reviews_count?: number
          tags?: string[]
          tags_en?: string[] | null
          tags_hy?: string[] | null
          tags_ru?: string[] | null
          time_yel_map?: Json | null
          times?: string[]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_player_id: { Args: { p_id: number }; Returns: string }
      redeem_prize: {
        Args: { p_prize_id: string; p_user_id: string }
        Returns: Json
      }
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
    Enums: {},
  },
} as const

// ── Convenience row/update aliases ───────────────────────────────────────────
type T = Database['public']['Tables']
export type AdminActivityRow    = T['admin_activity_log']['Row']
export type LocationRow         = T['locations']['Row']
export type ConciergeMessageRow = T['concierge_messages']['Row']
export type ConciergeSessionRow = T['concierge_sessions']['Row']
export type GuideRow            = T['guides']['Row']
export type MenuCategoryRow     = T['menu_categories']['Row']
export type MenuItemRow         = T['menu_items']['Row']
export type MenuItemUpdate      = T['menu_items']['Update']
export type PrizeRow            = T['prizes']['Row']
export type ProfileRow          = T['profiles']['Row']
export type ReservationRow      = T['reservations']['Row']
export type ReviewRow           = T['reviews']['Row']
export type SettingRow          = T['settings']['Row']
export type UserPrizeRow        = T['user_prizes']['Row']
export type OccasionRow         = T['occasions']['Row']
export type BannerRow           = T['banners']['Row']
export type VenueBlockedDateRow = T['venue_blocked_dates']['Row']
export type VenueRow            = T['venues']['Row']
