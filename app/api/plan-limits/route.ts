import { NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'

export async function GET() {
  try {
    // Get all plan limits for displaying pricing information
    const planLimits = await subscriptionService.getAllPlanLimits()

    // Transform the data for frontend consumption
    const formattedPlans = planLimits.map(plan => ({
      plan: plan.plan,
      maxMonitors: plan.max_monitors === -1 ? 'Unlimited' : plan.max_monitors,
      allowedIntervals: plan.allowed_intervals,
      allowedNotificationTypes: plan.allowed_notification_types,
      maxNotificationChannels: plan.max_notification_channels === -1 ? 'Unlimited' : plan.max_notification_channels,
      allowedChartTimeframes: plan.allowed_chart_timeframes,
      apiRateLimit: plan.api_rate_limit,
      prioritySupport: plan.priority_support,
      features: {
        // Free plan features
        ...(plan.plan === 'free' && {
          checkIntervals: '30 minutes, 1 hour',
          apiEndpoints: '3 monitors maximum',
          alerts: 'Email notifications only',
          analytics: '1 hour and 6 hour timeframes only',
          support: 'Community support'
        }),
        // Pro plan features
        ...(plan.plan === 'pro' && {
          checkIntervals: 'All intervals (1min, 5min, 10min, 15min, 30min, 1hour)',
          apiEndpoints: 'Unlimited monitors',
          alerts: 'Email, SMS, and webhook notifications',
          analytics: 'All timeframes (1h, 6h, 24h, 7d, 30d)',
          support: 'Priority support'
        })
      }
    }))

    return NextResponse.json({
      plans: formattedPlans
    })

  } catch (error) {
    console.error('Error fetching plan limits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}