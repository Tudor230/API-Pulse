import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Monitor } from '@/lib/supabase-types'

export async function GET(request: Request) {
  // Verify this is a legitimate cron request from AWS Scheduler
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create Supabase admin client to bypass RLS for cron jobs
    const supabase = createAdminClient()

    // Get monitors that are due for checking (batch of 10)
    const { data: monitors, error } = await supabase
      .from('monitors')
      .select('*')
      .lt('next_check_at', new Date().toISOString())
      .eq('is_active', true)
      .limit(10)

    if (error) {
      console.error('Error fetching monitors:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!monitors || monitors.length === 0) {
      return NextResponse.json({ message: 'No monitors to check' })
    }

    console.log(`Processing ${monitors.length} monitors`)

    // Process each monitor
    const results = await Promise.allSettled(
      monitors.map(monitor => checkMonitor(monitor, supabase))
    )

    const processed = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Cron job completed: ${processed} processed, ${failed} failed`)

    return NextResponse.json({ 
      processed, 
      failed, 
      total: monitors.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function checkMonitor(monitor: Monitor, supabase: any) {
  const startTime = Date.now()
  let status: Monitor['status'] = 'down'
  let responseTime: number | null = null

  console.log(`Checking monitor: ${monitor.name} (${monitor.url})`)

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(monitor.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'API-Pulse-Monitor/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    responseTime = Date.now() - startTime
    status = response.ok ? 'up' : 'down'
    
    console.log(`Monitor ${monitor.name}: ${status} (${responseTime}ms)`)
    
  } catch (error) {
    responseTime = Date.now() - startTime
    
    // Check if the error is due to timeout (AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Monitor ${monitor.name}: timeout (${responseTime}ms)`)
      status = 'timeout'
    } else {
      console.error(`Monitor ${monitor.id} check failed:`, error)
      status = 'down'
    }
  }

  // Calculate next check time based on interval
  const nextCheckAt = new Date(Date.now() + (monitor.interval_minutes * 60 * 1000))

  // Update monitor status
  const { error: updateError } = await supabase
    .from('monitors')
    .update({
      status,
      last_checked_at: new Date().toISOString(),
      next_check_at: nextCheckAt.toISOString(),
      response_time: responseTime
    })
    .eq('id', monitor.id)

  if (updateError) {
    console.error(`Error updating monitor ${monitor.id}:`, updateError)
    throw updateError
  }

  // If status changed from up to down, trigger alert
  if (monitor.status === 'up' && status === 'down') {
    await triggerAlert(monitor, supabase)
  }

  return { id: monitor.id, status, responseTime }
}

async function triggerAlert(monitor: Monitor, supabase: any) {
  // Log the downtime alert
  console.log(`🚨 ALERT: Monitor "${monitor.name}" is down! URL: ${monitor.url}`)
  
  // TODO: Implement additional alerting logic here
  // This could include:
  // - Sending emails via Resend
  // - Creating notifications in the database
  // - Sending webhooks to external services
  // - Integrating with Slack, Discord, etc.
  
  // For now, we'll just log the alert
  // In a production system, you would add:
  // - Email notifications to the monitor owner
  // - Webhook calls to external services
  // - In-app notifications
} 