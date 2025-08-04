import { createClient } from '@supabase/supabase-js'

// These will be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          balance: number
          total_wagered: number
          total_won: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      game_sessions: {
        Row: {
          id: string
          user_id: string
          bet_amount: number
          grid_state: any
          win_amount: number
          clusters: any
          special_symbols: any
          is_free_spin: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['game_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['game_sessions']['Insert']>
      }
    }
  }
}
