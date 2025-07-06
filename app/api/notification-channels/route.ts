import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { validateChannelConfig } from '@/lib/utils'
import { AlertType } from '@/lib/supabase-types'
import { logger } from '@/lib/logger'
import { subscriptionService } from '@/lib/subscription-service'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: channels, error } = await supabase
    .from('notification_channels')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    logger.apiError('GET', '/api/notification-channels', error, user?.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ channels })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, type, config } = body

    // Validate required fields
    if (!name || !type || !config) {
      return NextResponse.json({ error: 'Name, type, and config are required' }, { status: 400 })
    }

    // Validate channel type
    if (!['email', 'sms', 'webhook'].includes(type)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    // Validate channel configuration
    const validation = validateChannelConfig(type as AlertType, config)
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid configuration',
        details: validation.errors
      }, { status: 400 })
    }

    // Check subscription limits
    const canCreateChannel = await subscriptionService.canCreateNotificationChannel(user.id, type as AlertType)
    if (!canCreateChannel) {
      const allowedTypes = await subscriptionService.getAllowedNotificationTypes(user.id)
      return NextResponse.json({ 
        error: `Cannot create ${type} notification channel. Your plan allows: ${allowedTypes.join(', ')}. Upgrade to Pro for unlimited channels and all notification types.`,
        code: 'NOTIFICATION_CHANNEL_LIMIT_EXCEEDED',
        allowedTypes
      }, { status: 403 })
    }

    // Create the notification channel
    const { data: channel, error } = await supabase
      .from('notification_channels')
      .insert({
        name,
        type: type as AlertType,
        config,
        user_id: user.id,
        is_active: true,
        is_verified: type === 'webhook', // Webhooks are verified by default
      })
      .select()
      .single()

    if (error) {
      logger.apiError('POST', '/api/notification-channels', error, user?.id)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create alert rules for all existing monitors
    const { data: monitors, error: monitorsError } = await supabase
      .from('monitors')
      .select('id')

    if (!monitorsError && monitors && monitors.length > 0) {
      // Create alert rules for each monitor
      const alertRules = monitors.map(monitor => ({
        monitor_id: monitor.id,
        notification_channel_id: channel.id,
        user_id: user.id,
        alert_on_down: true,
        alert_on_up: true,
        alert_on_timeout: true,
        consecutive_failures_threshold: 5,
        cooldown_minutes: 60,
        is_active: true,
      }))

      const { error: rulesError } = await supabase
        .from('monitor_alert_rules')
        .insert(alertRules)

      if (rulesError) {
        console.error('Error creating alert rules:', rulesError)
        // Don't fail the whole request, just log the error
      } else {
        console.log(`Created ${alertRules.length} alert rules for new channel`)
      }
    }

    // Update subscription usage after successful channel creation
    const currentChannelCount = await subscriptionService.getCurrentNotificationChannelsCount(user.id)
    await subscriptionService.updateSubscriptionUsage(user.id, {
      notificationChannelsCount: currentChannelCount
    })

    // TODO: For email/SMS channels, send verification message
    // This would involve generating a verification token and sending it

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 