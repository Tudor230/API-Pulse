// Example usage patterns for Supabase clients
// This file shows how to properly use the Supabase utilities

import { createServerClient, createRouteClient, createBrowserClient, handleSupabaseError } from './supabase'

// ================================
// SERVER COMPONENT EXAMPLES
// ================================

// Example: Fetching monitors in a Server Component (page.tsx)
export async function getMonitorsForServerComponent() {
  const supabase = createServerClient()
  
  try {
    // RLS automatically filters by user_id - no need to add .eq('user_id', userId)
    const { data: monitors, error } = await supabase
      .from('monitors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching monitors:', error)
      return { monitors: [], error: handleSupabaseError(error, 'getMonitors') }
    }

    return { monitors: monitors || [], error: null }
  } catch (error) {
    return { monitors: [], error: 'Failed to fetch monitors' }
  }
}

// ================================
// API ROUTE HANDLER EXAMPLES
// ================================

// Example: GET /api/monitors/route.ts
export async function handleGetMonitors(request: Request) {
  const supabase = createRouteClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { error: 'Unauthorized', status: 401 }
  }

  try {
    const { data: monitors, error } = await supabase
      .from('monitors')
      .select('*')

    if (error) {
      return { 
        error: handleSupabaseError(error, 'API: getMonitors'), 
        status: 500 
      }
    }

    return { monitors: monitors || [], status: 200 }
  } catch (error) {
    return { error: 'Internal server error', status: 500 }
  }
}

// Example: POST /api/monitors/route.ts
export async function handleCreateMonitor(request: Request) {
  const supabase = createRouteClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { error: 'Unauthorized', status: 401 }
  }

  try {
    const body = await request.json()
    const { url, name, interval_minutes } = body

    // Validate required fields
    if (!url || !name) {
      return { error: 'URL and name are required', status: 400 }
    }

    // Calculate next check time
    const nextCheckAt = new Date(Date.now() + (interval_minutes * 60 * 1000))

    const { data: monitor, error } = await supabase
      .from('monitors')
      .insert({
        url,
        name,
        interval_minutes: interval_minutes || 5,
        user_id: session.user.id,
        status: 'pending',
        is_active: true,
        next_check_at: nextCheckAt.toISOString()
      })
      .select()
      .single()

    if (error) {
      return { 
        error: handleSupabaseError(error, 'API: createMonitor'), 
        status: 500 
      }
    }

    return { monitor, status: 201 }
  } catch (error) {
    return { error: 'Internal server error', status: 500 }
  }
}

// ================================
// CLIENT COMPONENT EXAMPLES
// ================================

// Example: Client-side monitor operations
export class MonitorService {
  private supabase = createBrowserClient()

  async createMonitor(monitorData: { url: string; name: string; interval_minutes: number }) {
    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(monitorData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create monitor')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating monitor:', error)
      throw error
    }
  }

  async updateMonitor(id: string, updates: Partial<{ name: string; url: string; interval_minutes: number; is_active: boolean }>) {
    try {
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update monitor')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating monitor:', error)
      throw error
    }
  }

  async deleteMonitor(id: string) {
    try {
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete monitor')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting monitor:', error)
      throw error
    }
  }

  // Real-time subscription example (for Client Components)
  subscribeToMonitors(callback: (monitors: any[]) => void) {
    const channel = this.supabase
      .channel('monitors-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'monitors' 
        }, 
        (payload) => {
          console.log('Real-time update:', payload)
          // Refetch monitors or update local state
          this.getMonitors().then(callback)
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  private async getMonitors() {
    const { data: monitors, error } = await this.supabase
      .from('monitors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching monitors:', error)
      return []
    }

    return monitors || []
  }
}

// ================================
// AUTHENTICATION HELPERS
// ================================

// Client-side auth helpers
export class AuthService {
  private supabase = createBrowserClient()

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      throw new Error(handleSupabaseError(error, 'signUp'))
    }

    return data
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(handleSupabaseError(error, 'signIn'))
    }

    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'signOut'))
    }
  }

  async getSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }

    return session
  }

  onAuthStateChange(callback: (session: any) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session)
    })
  }
} 