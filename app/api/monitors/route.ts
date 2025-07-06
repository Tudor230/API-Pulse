import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: monitors, error } = await supabase
      .from('monitors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.apiError('GET', '/api/monitors', error, user?.id)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ monitors: monitors || [] })
  } catch (error) {
    logger.apiError('GET', '/api/monitors', error, user?.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
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
        user_id: user.id,
        status: 'pending',
        is_active: true,
        next_check_at: nextCheckAt.toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.apiError('POST', '/api/monitors', error, user?.id)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ monitor }, { status: 201 })
  } catch (error) {
    logger.apiError('POST', '/api/monitors', error, user?.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 