// Type definitions for our database schema
export interface Monitor {
  id: string
  user_id: string
  name: string
  url: string
  status: 'up' | 'down' | 'pending' | 'unknown'
  interval_minutes: number
  is_active: boolean
  response_time: number | null
  last_checked_at: string | null
  next_check_at: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      monitors: {
        Row: Monitor
        Insert: Omit<Monitor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Monitor, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
} 