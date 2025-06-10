import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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

// Server Component Client
// Use this in async Server Components for data fetching
export const createServerClient = () => {
  return createServerComponentClient<Database>({ cookies })
}

// API Route Handler Client
// Use this in API route handlers (app/api/*/route.ts)
export const createRouteClient = () => {
  return createRouteHandlerClient<Database>({ cookies })
}

// Client Component Client
// Use this in Client Components that need Supabase access
export const createBrowserClient = () => {
  return createClientComponentClient<Database>()
}

// Environment variables validation
export const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return { url, anonKey }
}

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error)
  
  // Common error types
  if (error.code === 'PGRST116') {
    return 'No data found'
  }
  
  if (error.code === '23505') {
    return 'This record already exists'
  }
  
  if (error.code === '42501') {
    return 'Access denied - check your permissions'
  }
  
  return error.message || 'An unexpected error occurred'
} 