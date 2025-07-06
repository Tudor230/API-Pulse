import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const monitorId = url.searchParams.get('monitor_id')

  let query = supabase
    .from('monitor_alert_rules')
    .select(`
      *,
      monitors (id, name, url),
      notification_channels (id, name, type, config)
    `)
    .order('created_at', { ascending: false })

  if (monitorId) {
    query = query.eq('monitor_id', monitorId)
  }

  const { data: alertRules, error } = await query

  if (error) {
    logger.apiError('GET', '/api/alert-rules', error, user?.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ alertRules })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      monitor_id,
      notification_channel_id,
      alert_on_down = true,
      alert_on_up = false,
      alert_on_timeout = true,
      consecutive_failures_threshold = 5,
      cooldown_minutes = 60
    } = body

    // Validate required fields
    if (!monitor_id || !notification_channel_id) {
      return NextResponse.json({
        error: 'Monitor ID and notification channel ID are required'
      }, { status: 400 })
    }

    // Validate that the monitor belongs to the user
    const { data: monitor, error: monitorError } = await supabase
      .from('monitors')
      .select('id')
      .eq('id', monitor_id)
      .single()

    if (monitorError || !monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Validate that the notification channel belongs to the user
    const { data: channel, error: channelError } = await supabase
      .from('notification_channels')
      .select('id')
      .eq('id', notification_channel_id)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Notification channel not found' }, { status: 404 })
    }

    // Validate numeric constraints
    if (consecutive_failures_threshold < 1) {
      return NextResponse.json({
        error: 'Consecutive failures threshold must be at least 1'
      }, { status: 400 })
    }

    if (cooldown_minutes < 0) {
      return NextResponse.json({
        error: 'Cooldown minutes cannot be negative'
      }, { status: 400 })
    }

    // Create the alert rule (or update if it exists due to unique constraint)
    const { data: alertRule, error } = await supabase
      .from('monitor_alert_rules')
      .upsert({
        monitor_id,
        notification_channel_id,
        user_id: user.id,
        alert_on_down,
        alert_on_up,
        alert_on_timeout,
        consecutive_failures_threshold,
        cooldown_minutes,
        is_active: true,
      })
      .select(`
        *,
        monitors (id, name, url),
        notification_channels (id, name, type)
      `)
      .single()

    if (error) {
      logger.apiError('POST', '/api/alert-rules', error, user?.id)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ alertRule }, { status: 201 })
  } catch (error) {
    logger.apiError('POST', '/api/alert-rules', error, user?.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 