import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { subscriptionService } from '@/lib/subscription-service'

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

    // Check subscription limits
    const canCreateMonitor = await subscriptionService.canCreateMonitor(user.id)
    if (!canCreateMonitor) {
      return NextResponse.json({
        error: 'Monitor limit reached. Upgrade to Pro plan for unlimited monitors.',
        code: 'MONITOR_LIMIT_EXCEEDED'
      }, { status: 403 })
    }

    // Check if user can use the specified interval
    const intervalToUse = interval_minutes || 5
    const canUseInterval = await subscriptionService.canUseInterval(user.id, intervalToUse)
    if (!canUseInterval) {
      const allowedIntervals = await subscriptionService.getAllowedIntervals(user.id)
      return NextResponse.json({
        error: `Interval ${intervalToUse} minutes not allowed. Available intervals: ${allowedIntervals.join(', ')} minutes.`,
        code: 'INTERVAL_NOT_ALLOWED',
        allowedIntervals
      }, { status: 403 })
    }

    // Calculate next check time
    const nextCheckAt = new Date(Date.now())

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

    // Update subscription usage after successful monitor creation
    const currentMonitorCount = await subscriptionService.getCurrentMonitorCount(user.id)
    await subscriptionService.updateSubscriptionUsage(user.id, {
      monitorCount: currentMonitorCount
    })

    return NextResponse.json({ monitor }, { status: 201 })
  } catch (error) {
    logger.apiError('POST', '/api/monitors', error, user?.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 