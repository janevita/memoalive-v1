// ─────────────────────────────────────────────────────────────────────────────
// Memoalive — Supabase Database Types
// Normally generated via `supabase gen types typescript --linked`
// Hand-written here to match the schema in supabase/migrations/001_initial_schema.sql
// ─────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:         string
          name:       string
          avatar_url: string | null
          bio:        string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id:          string
          name:        string
          avatar_url?: string | null
          bio?:        string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?:       string
          avatar_url?: string | null
          bio?:        string | null
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id:          string
          name:        string
          description: string | null
          cover_url:   string | null
          invite_code: string
          owner_id:    string
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:          string
          name:         string
          description?: string | null
          cover_url?:   string | null
          invite_code?: string
          owner_id:     string
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          name?:        string
          description?: string | null
          cover_url?:   string | null
          updated_at?:  string
        }
        Relationships: [
          {
            foreignKeyName: 'groups_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      group_members: {
        Row: {
          user_id:   string
          group_id:  string
          role:      Database['public']['Enums']['group_role']
          joined_at: string
        }
        Insert: {
          user_id:    string
          group_id:   string
          role?:      Database['public']['Enums']['group_role']
          joined_at?: string
        }
        Update: {
          role?: Database['public']['Enums']['group_role']
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          }
        ]
      }
      memories: {
        Row: {
          id:           string
          group_id:     string
          author_id:    string
          title:        string
          content:      string | null
          genre:        Database['public']['Enums']['genre']
          media_type:   Database['public']['Enums']['media_type']
          location:     string | null
          taken_at:     string | null
          is_published: boolean
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:           string
          group_id:      string
          author_id:     string
          title:         string
          content?:      string | null
          genre?:        Database['public']['Enums']['genre']
          media_type?:   Database['public']['Enums']['media_type']
          location?:     string | null
          taken_at?:     string | null
          is_published?: boolean
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          title?:        string
          content?:      string | null
          genre?:        Database['public']['Enums']['genre']
          location?:     string | null
          taken_at?:     string | null
          is_published?: boolean
          updated_at?:   string
        }
        Relationships: [
          {
            foreignKeyName: 'memories_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memories_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      media_items: {
        Row: {
          id:               string
          memory_id:        string
          url:              string
          thumbnail_url:    string | null
          type:             Database['public']['Enums']['media_type']
          caption:          string | null
          sort_order:       number
          duration_seconds: number | null
          transcription:    string | null
          created_at:       string
        }
        Insert: {
          id?:               string
          memory_id:         string
          url:               string
          thumbnail_url?:    string | null
          type?:             Database['public']['Enums']['media_type']
          caption?:          string | null
          sort_order?:       number
          duration_seconds?: number | null
          transcription?:    string | null
          created_at?:       string
        }
        Update: {
          caption?:          string | null
          sort_order?:       number
          thumbnail_url?:    string | null
          transcription?:    string | null
        }
        Relationships: [
          {
            foreignKeyName: 'media_items_memory_id_fkey'
            columns: ['memory_id']
            isOneToOne: false
            referencedRelation: 'memories'
            referencedColumns: ['id']
          }
        ]
      }
      cast_members: {
        Row: {
          user_id:           string
          memory_id:         string
          tagged_by_user_id: string
        }
        Insert: {
          user_id:           string
          memory_id:         string
          tagged_by_user_id: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'cast_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cast_members_memory_id_fkey'
            columns: ['memory_id']
            isOneToOne: false
            referencedRelation: 'memories'
            referencedColumns: ['id']
          }
        ]
      }
      reactions: {
        Row: {
          id:         string
          memory_id:  string
          user_id:    string
          type:       Database['public']['Enums']['reaction_type']
          created_at: string
        }
        Insert: {
          id?:         string
          memory_id:   string
          user_id:     string
          type:        Database['public']['Enums']['reaction_type']
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'reactions_memory_id_fkey'
            columns: ['memory_id']
            isOneToOne: false
            referencedRelation: 'memories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: {
          id:         string
          memory_id:  string
          author_id:  string
          content:    string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:         string
          memory_id:   string
          author_id:   string
          content:     string
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?:    string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_memory_id_fkey'
            columns: ['memory_id']
            isOneToOne: false
            referencedRelation: 'memories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      group_role:    'owner' | 'admin' | 'member'
      media_type:    'photo' | 'video' | 'voice' | 'text'
      reaction_type: 'heart' | 'moved' | 'proud' | 'funny' | 'favourite'
      genre:         'adventure' | 'drama' | 'comedy' | 'romance' | 'coming-of-age' | 'documentary'
    }
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
