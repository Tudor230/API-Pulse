import { createRouteClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: monitors, error } = await supabase
      .from('monitors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching monitors:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ monitors: monitors || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createRouteClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { url, name, interval_minutes } = body

    // Validate required fields
    if (!url || !name) {
      return NextResponse.json({ error: 'URL and name are required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Calculate next check time
    const nextCheckAt = new Date(Date.now() + ((interval_minutes || 5) * 60 * 1000))

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
      console.error('Error creating monitor:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ monitor }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 