export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {

      locations: {
        Row: {
          id: string;
          name_hy: string;
          name_ru: string;
          name_en: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_hy: string;
          name_ru: string;
          name_en: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_hy?: string;
          name_ru?: string;
          name_en?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      venues: {
        Row: {
          id: string;
          name: string;
          name_hy: string | null;
          name_ru: string | null;
          name_en: string | null;
          cuisine: string;
          cuisine_hy: string | null;
          cuisine_ru: string | null;
          cuisine_en: string | null;
          area: string;
          area_hy: string | null;
          area_ru: string | null;
          area_en: string | null;
          price: string;
          rating: number;
          reviews_count: number;
          photo_url: string;
          dish_url: string;
          distance_km: string;
          booked_today: number;
          heat: 'high' | 'med' | 'low';
          kind: 'restaurant' | 'bar' | 'lounge' | 'club';
          coord_x: number;
          coord_y: number;
          description: string;
          description_hy: string | null;
          description_ru: string | null;
          description_en: string | null;
          times: string[];
          time_yel_map: Json | null;
          perk: string;
          perk_hy: string | null;
          perk_ru: string | null;
          perk_en: string | null;
          tags: string[];
          tags_hy: string[] | null;
          tags_ru: string[] | null;
          tags_en: string[] | null;
          location_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          name_hy?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          cuisine: string;
          cuisine_hy?: string | null;
          cuisine_ru?: string | null;
          cuisine_en?: string | null;
          area: string;
          area_hy?: string | null;
          area_ru?: string | null;
          area_en?: string | null;
          price: string;
          rating: number;
          reviews_count: number;
          photo_url: string;
          dish_url: string;
          distance_km: string;
          booked_today: number;
          heat: 'high' | 'med' | 'low';
          kind: 'restaurant' | 'bar' | 'lounge' | 'club';
          coord_x: number;
          coord_y: number;
          description: string;
          description_hy?: string | null;
          description_ru?: string | null;
          description_en?: string | null;
          times: string[];
          time_yel_map?: Json | null;
          perk: string;
          perk_hy?: string | null;
          perk_ru?: string | null;
          perk_en?: string | null;
          tags: string[];
          tags_hy?: string[] | null;
          tags_ru?: string[] | null;
          tags_en?: string[] | null;
          location_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['venues']['Insert']>;
      };

      reservations: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          people: number;
          date: string;
          date_iso: string | null;
          time: string;
          occasion: string | null;
          note: string | null;
          status: ReservationStatus;
          yel_earned: string;
          admin_note: string | null;
          confirmed_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          sla_deadline: string | null;
          agent_id: string | null;
          reminder_day_before_sent: boolean;
          reminder_2h_sent: boolean;
          sla_alert_sent_at: string | null;
          book_again_nudge_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id: string;
          people: number;
          date: string;
          date_iso?: string | null;
          time: string;
          occasion?: string | null;
          note?: string | null;
          status: ReservationStatus;
          yel_earned: string;
          admin_note?: string | null;
          confirmed_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          sla_deadline?: string | null;
          agent_id?: string | null;
          reminder_day_before_sent?: boolean;
          reminder_2h_sent?: boolean;
          sla_alert_sent_at?: string | null;
          book_again_nudge_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          venue_id?: string;
          people?: number;
          date?: string;
          date_iso?: string | null;
          time?: string;
          occasion?: string | null;
          note?: string | null;
          status?: ReservationStatus;
          yel_earned?: string;
          admin_note?: string | null;
          confirmed_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          sla_deadline?: string | null;
          agent_id?: string | null;
          reminder_day_before_sent?: boolean;
          reminder_2h_sent?: boolean;
          sla_alert_sent_at?: string | null;
          book_again_nudge_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      favorites: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          venue_id?: string;
          created_at?: string;
        };
      };

      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          tier: string;
          tier_level: number;
          yel_points: number;
          total_visits: number;
          is_admin: boolean;
          player_id: number;
          phone: string | null;
          surname: string | null;
          date_of_birth: string | null;
          language: string;
          created_at: string;
          updated_at: string;
          notif_booking_updates: boolean;
          notif_reminders: boolean;
          notif_review_prompt: boolean;
          push_token: string | null;
          profile_visible: boolean;
          notif_friend_activity: boolean;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          tier?: string;
          tier_level?: number;
          yel_points?: number;
          total_visits?: number;
          is_admin?: boolean;
          player_id?: number;
          phone?: string | null;
          surname?: string | null;
          date_of_birth?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
          notif_booking_updates?: boolean;
          notif_reminders?: boolean;
          notif_review_prompt?: boolean;
          push_token?: string | null;
          profile_visible?: boolean;
          notif_friend_activity?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          tier?: string;
          tier_level?: number;
          yel_points?: number;
          total_visits?: number;
          is_admin?: boolean;
          player_id?: number;
          phone?: string | null;
          surname?: string | null;
          date_of_birth?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
          notif_booking_updates?: boolean;
          notif_reminders?: boolean;
          notif_review_prompt?: boolean;
          push_token?: string | null;
          profile_visible?: boolean;
          notif_friend_activity?: boolean;
        };
      };

      menu_categories: {
        Row: {
          id: string;
          venue_id: string;
          name: string;
          name_hy: string | null;
          name_ru: string | null;
          name_en: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          name: string;
          name_hy?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          name?: string;
          name_hy?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      menu_items: {
        Row: {
          id: string;
          venue_id: string;
          category_id: string;
          name: string;
          name_hy: string | null;
          name_ru: string | null;
          name_en: string | null;
          description: string | null;
          description_hy: string | null;
          description_ru: string | null;
          description_en: string | null;
          price: number;
          photo_url: string | null;
          is_available: boolean;
          is_popular: boolean;
          allergens: string[];
          allergens_hy: string[] | null;
          allergens_ru: string[] | null;
          allergens_en: string[] | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          category_id: string;
          name: string;
          name_hy?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          description?: string | null;
          description_hy?: string | null;
          description_ru?: string | null;
          description_en?: string | null;
          price: number;
          photo_url?: string | null;
          is_available?: boolean;
          is_popular?: boolean;
          allergens?: string[];
          allergens_hy?: string[] | null;
          allergens_ru?: string[] | null;
          allergens_en?: string[] | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          category_id?: string;
          name?: string;
          name_hy?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          description?: string | null;
          description_hy?: string | null;
          description_ru?: string | null;
          description_en?: string | null;
          price?: number;
          photo_url?: string | null;
          is_available?: boolean;
          is_popular?: boolean;
          allergens?: string[];
          allergens_hy?: string[] | null;
          allergens_ru?: string[] | null;
          allergens_en?: string[] | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      guides: {
        Row: {
          id: string;
          title: string;
          title_hy: string | null;
          title_ru: string | null;
          title_en: string | null;
          subtitle: string;
          subtitle_hy: string | null;
          subtitle_ru: string | null;
          subtitle_en: string | null;
          count: number;
          cover_url: string;
          tag: string;
          tag_hy: string | null;
          tag_ru: string | null;
          tag_en: string | null;
          sort_order: number;
          is_active: boolean;
          venue_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          title_hy?: string | null;
          title_ru?: string | null;
          title_en?: string | null;
          subtitle: string;
          subtitle_hy?: string | null;
          subtitle_ru?: string | null;
          subtitle_en?: string | null;
          count?: number;
          cover_url: string;
          tag: string;
          tag_hy?: string | null;
          tag_ru?: string | null;
          tag_en?: string | null;
          sort_order?: number;
          is_active?: boolean;
          venue_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          title_hy?: string | null;
          title_ru?: string | null;
          title_en?: string | null;
          subtitle?: string;
          subtitle_hy?: string | null;
          subtitle_ru?: string | null;
          subtitle_en?: string | null;
          count?: number;
          cover_url?: string;
          tag?: string;
          tag_hy?: string | null;
          tag_ru?: string | null;
          tag_en?: string | null;
          sort_order?: number;
          is_active?: boolean;
          venue_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };

      concierge_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          status: 'active' | 'escalated' | 'resolved';
          started_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: 'active' | 'escalated' | 'resolved';
          started_at?: string;
          last_message_at?: string;
        };
        Update: Partial<Database['public']['Tables']['concierge_sessions']['Insert']>;
      };

      concierge_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant';
          text: string;
          suggestions: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant';
          text: string;
          suggestions?: string[] | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['concierge_messages']['Insert']>;
      };

      reviews: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          reservation_id: string;
          rating: number;
          comment: string | null;
          is_anonymous: boolean;
          status: 'pending' | 'approved' | 'hidden';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id: string;
          reservation_id: string;
          rating: number;
          comment?: string | null;
          is_anonymous?: boolean;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          is_anonymous?: boolean;
        };
      };

      venue_hours: {
        Row: {
          id: string;
          venue_id: string;
          day_of_week: number;
          is_open: boolean;
          open_time: string | null;
          close_time: string | null;
        };
        Insert: {
          id?: string;
          venue_id: string;
          day_of_week: number;
          is_open?: boolean;
          open_time?: string | null;
          close_time?: string | null;
        };
        Update: Partial<Database['public']['Tables']['venue_hours']['Insert']>;
      };

      venue_blocked_dates: {
        Row: {
          id: string;
          venue_id: string;
          date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['venue_blocked_dates']['Insert']>;
      };

      venue_photos: {
        Row: {
          id:         string;
          venue_id:   string;
          url:        string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?:         string;
          venue_id:    string;
          url:         string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['venue_photos']['Insert']>;
      };

      home_sections: {
        Row: {
          id: string;
          name: string;
          name_hy: string | null;
          name_ru: string | null;
          name_en: string | null;
          eyebrow: string;
          eyebrow_hy: string | null;
          eyebrow_ru: string | null;
          eyebrow_en: string | null;
          sort_order: number;
          is_active: boolean;
          section_type: 'venue' | 'guide';
          is_builtin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_hy?: string | null;
          name_ru?: string | null;
          name_en?: string | null;
          eyebrow?: string;
          eyebrow_hy?: string | null;
          eyebrow_ru?: string | null;
          eyebrow_en?: string | null;
          sort_order?: number;
          is_active?: boolean;
          section_type?: 'venue' | 'guide';
          is_builtin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['home_sections']['Insert']>;
      };

      home_section_items: {
        Row: {
          id: string;
          section_id: string;
          sort_order: number;
          item_type: 'venue' | 'guide';
          venue_id: string | null;
          guide_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          sort_order?: number;
          item_type: 'venue' | 'guide';
          venue_id?: string | null;
          guide_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['home_section_items']['Insert']>;
      };

      occasions: {
        Row: {
          id: string;
          name_hy: string;
          name_ru: string;
          name_en: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name_hy: string;
          name_ru: string;
          name_en: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name_hy?: string;
          name_ru?: string;
          name_en?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };

      banners: {
        Row: {
          id:          string;
          image_url:   string;
          title:       string | null;
          subtitle:    string | null;
          tap_action:  'none' | 'deep_link' | 'external_url';
          tap_url:     string | null;
          is_active:   boolean;
          sort_order:  number;
          start_date:  string | null;
          end_date:    string | null;
          language:    'hy' | 'ru' | 'en';
          slug:        string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: {
          id?:         string;
          image_url:   string;
          title?:      string | null;
          subtitle?:   string | null;
          tap_action?: 'none' | 'deep_link' | 'external_url';
          tap_url?:    string | null;
          is_active?:  boolean;
          sort_order?: number;
          start_date?: string | null;
          end_date?:   string | null;
          language?:   'hy' | 'ru' | 'en';
          slug?:       string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id:          string;
          image_url:   string;
          title:       string | null;
          subtitle:    string | null;
          tap_action:  'none' | 'deep_link' | 'external_url';
          tap_url:     string | null;
          is_active:   boolean;
          sort_order:  number;
          start_date:  string | null;
          end_date:    string | null;
          language:    'hy' | 'ru' | 'en';
          slug:        string | null;
          created_at:  string;
          updated_at:  string;
        }>;
      };

      friendships: {
        Row: {
          id:           string;
          requester_id: string;
          addressee_id: string;
          status:       'pending' | 'accepted' | 'declined';
          created_at:   string;
          updated_at:   string;
        };
        Insert: {
          id?:           string;
          requester_id:  string;
          addressee_id:  string;
          status?:       'pending' | 'accepted' | 'declined';
          created_at?:   string;
          updated_at?:   string;
        };
        Update: {
          status?:     'pending' | 'accepted' | 'declined';
          updated_at?: string;
        };
      };

      friend_activity_feed: {
        Row: {
          id:          string;
          actor_id:    string;
          event_type:  'review' | 'visited';
          venue_id:    string | null;
          venue_name:  string | null;
          rating:      number | null;
          review_text: string | null;
          visited_at:  string | null;
          source_id:   string;
          created_at:  string;
        };
        Insert: {
          id?:          string;
          actor_id:     string;
          event_type:   'review' | 'visited';
          venue_id?:    string | null;
          venue_name?:  string | null;
          rating?:      number | null;
          review_text?: string | null;
          visited_at?:  string | null;
          source_id:    string;
          created_at?:  string;
        };
        Update: Record<string, never>;
      };

      reservation_alternatives: {
        Row: {
          id: string;
          reservation_id: string;
          date: string;
          date_iso: string;
          time: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reservation_id: string;
          date: string;
          date_iso: string;
          time: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reservation_id?: string;
          date?: string;
          date_iso?: string;
          time?: string;
          note?: string | null;
          created_at?: string;
        };
      };

      tier_perks: {
        Row: {
          id:         string;
          tier_level: number;
          label_hy:   string;
          label_ru:   string;
          label_en:   string;
          icon_name:  string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?:         string;
          tier_level:  number;
          label_hy?:   string;
          label_ru?:   string;
          label_en?:   string;
          icon_name?:  string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          tier_level?:  number;
          label_hy?:    string;
          label_ru?:    string;
          label_en?:    string;
          icon_name?:   string | null;
          sort_order?:  number;
        };
      };

    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ── Reservation status ────────────────────────────────────────────────────────
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'visited'
  | 'completed'
  | 'pending_confirmation'
  | 'rejected'
  | 'alternative_offered';

// ── Convenience row types ─────────────────────────────────────────────────────
export type LocationRow       = Database['public']['Tables']['locations']['Row'];
export type VenueRow          = Database['public']['Tables']['venues']['Row'];
export type ReservationRow    = Database['public']['Tables']['reservations']['Row'];
export type FavoriteRow       = Database['public']['Tables']['favorites']['Row'];
export type ProfileRow        = Database['public']['Tables']['profiles']['Row'];
export type MenuCategoryRow   = Database['public']['Tables']['menu_categories']['Row'];
export type MenuItemRow       = Database['public']['Tables']['menu_items']['Row'];
export type GuideRow          = Database['public']['Tables']['guides']['Row'];
export type ReviewRow             = Database['public']['Tables']['reviews']['Row'];
export type VenueHoursRow         = Database['public']['Tables']['venue_hours']['Row'];
export type VenueBlockedDateRow   = Database['public']['Tables']['venue_blocked_dates']['Row'];
export type HomeSectionRow        = Database['public']['Tables']['home_sections']['Row'];
export type HomeSectionItemRow    = Database['public']['Tables']['home_section_items']['Row'];
export type OccasionRow           = Database['public']['Tables']['occasions']['Row'];
export type BannerRow             = Database['public']['Tables']['banners']['Row'];
export type VenuePhotoRow         = Database['public']['Tables']['venue_photos']['Row'];
export type ReservationAlternativeRow = Database['public']['Tables']['reservation_alternatives']['Row'];
export type FriendshipRow         = Database['public']['Tables']['friendships']['Row'];
export type FriendActivityFeedRow = Database['public']['Tables']['friend_activity_feed']['Row'];
export type TierPerkRow           = Database['public']['Tables']['tier_perks']['Row'];
