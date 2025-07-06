import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { subscriptionService } from '@/lib/subscription-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription details
    const [subscription, planLimits, usage] = await Promise.all([
      subscriptionService.getUserSubscription(user.id),
      subscriptionService.getUserPlanLimits(user.id),
      subscriptionService.getSubscriptionUsage(user.id)
    ])

    // Get current usage counts
    const [monitorCount, notificationChannelsCount] = await Promise.all([
      subscriptionService.getCurrentMonitorCount(user.id),
      subscriptionService.getCurrentNotificationChannelsCount(user.id)
    ])

    return NextResponse.json({
      subscription,
      planLimits,
      usage,
      currentUsage: {
        monitorCount,
        notificationChannelsCount
      }
    })

  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update_usage':
        await subscriptionService.updateSubscriptionUsage(user.id, {
          monitorCount: body.monitorCount,
          notificationChannelsCount: body.notificationChannelsCount,
          apiCallsIncrement: body.apiCallsIncrement
        })

        return NextResponse.json({ success: true })

      case 'check_limits':
        const { type, value } = body
        let canPerformAction = false

        switch (type) {
          case 'create_monitor':
            canPerformAction = await subscriptionService.canCreateMonitor(user.id)
            break
          case 'use_interval':
            canPerformAction = await subscriptionService.canUseInterval(user.id, value)
            break
          case 'create_notification_channel':
            canPerformAction = await subscriptionService.canCreateNotificationChannel(user.id, value)
            break
          case 'access_timeframe':
            canPerformAction = await subscriptionService.canAccessTimeframe(user.id, value)
            break
          default:
            return NextResponse.json(
              { error: 'Invalid check type' },
              { status: 400 }
            )
        }

        return NextResponse.json({ canPerformAction })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error handling subscription request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}