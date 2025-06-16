import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Monitor, MonitorAlertRule, NotificationChannel, AlertLog } from '@/lib/supabase-types'
import { sendAlert, AlertContext } from '@/lib/alert-service'

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
  let lastError: Error | null = null

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
    lastError = error instanceof Error ? error : new Error(String(error))
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

  // Save monitoring history for analytics and graphs
  const { error: historyError } = await supabase
    .from('monitoring_history')
    .insert({
      monitor_id: monitor.id,
      user_id: monitor.user_id,
      status,
      response_time: responseTime,
      status_code: null, // We could capture this from the fetch response if needed
      error_message: status === 'down' || status === 'timeout' ? lastError?.toString() : null,
      checked_at: new Date().toISOString()
    })

  if (historyError) {
    console.error(`Error saving monitoring history for ${monitor.id}:`, historyError)
    // Don't throw here - monitoring history is not critical for monitor operation
  }

  // Check if we should trigger alerts for status changes
  const shouldAlert = (
    (monitor.status === 'up' && (status === 'down' || status === 'timeout')) || // Down/timeout alerts
    (monitor.status === 'down' && status === 'up') || // Recovery alerts
    (monitor.status === 'timeout' && status === 'up') // Recovery from timeout
  )
  console.log(shouldAlert, monitor.status, status)
  if (shouldAlert) {
    await triggerAlerts(monitor, status, supabase)
  }

  return { id: monitor.id, status, responseTime }
}

async function triggerAlerts(monitor: Monitor, newStatus: Monitor['status'], supabase: any) {
  console.log(`🔔 Checking alerts for monitor "${monitor.name}" (${monitor.status} → ${newStatus})`)
  
  try {
    // Get all active alert rules for this monitor
    const { data: alertRules, error: rulesError } = await supabase
      .from('monitor_alert_rules')
      .select(`
        *,
        notification_channels (*)
      `)
      .eq('monitor_id', monitor.id)
      .eq('is_active', true)
      .eq('notification_channels.is_active', true)
      .eq('notification_channels.is_verified', true)

    if (rulesError) {
      console.error('Error fetching alert rules:', rulesError)
      return
    }

    if (!alertRules || alertRules.length === 0) {
      console.log(`No active alert rules found for monitor ${monitor.id}`)
      return
    }

    // Count consecutive failures for this monitor
    const { data: recentHistory, error: historyError } = await supabase
      .from('monitoring_history')
      .select('status')
      .eq('monitor_id', monitor.id)
      .order('checked_at', { ascending: false })
      .limit(10)

    const consecutiveFailures = countConsecutiveFailures(recentHistory || [])

    // Process each alert rule
    for (const rule of alertRules) {
      const channel = rule.notification_channels

      // Check if this rule should trigger based on status change
      const shouldTrigger = shouldTriggerForRule(rule, monitor.status, newStatus)
      
      if (!shouldTrigger) {
        continue
      }

      // Check consecutive failures threshold
      if (consecutiveFailures < rule.consecutive_failures_threshold) {
        console.log(`Consecutive failures (${consecutiveFailures}) below threshold (${rule.consecutive_failures_threshold}) for rule ${rule.id}`)
        continue
      }

      // Check cooldown period
      const { data: shouldSend } = await supabase.rpc('should_send_alert', {
        p_monitor_id: monitor.id,
        p_notification_channel_id: channel.id,
        p_cooldown_minutes: rule.cooldown_minutes
      })

      if (!shouldSend) {
        console.log(`Alert suppressed due to cooldown for channel ${channel.id}`)
        continue
      }

      // Create alert context
      const alertContext: AlertContext = {
        monitor,
        channel,
        triggerStatus: newStatus,
        previousStatus: monitor.status,
        consecutiveFailures,
        responseTime: undefined // Will be set if available
      }

      // Log the alert attempt
      const { data: alertLog, error: logError } = await supabase
        .from('alert_logs')
        .insert({
          monitor_id: monitor.id,
          monitor_alert_rule_id: rule.id,
          notification_channel_id: channel.id,
          user_id: monitor.user_id,
          alert_type: channel.type,
          status: 'pending',
          trigger_status: newStatus,
          previous_status: monitor.status,
          consecutive_failures: consecutiveFailures,
          message: generateAlertMessage(monitor, newStatus, monitor.status),
        })
        .select()
        .single()

      if (logError) {
        console.error('Error creating alert log:', logError)
        continue
      }

      // Send the alert
      console.log(`📤 Sending ${channel.type} alert for monitor "${monitor.name}" to ${channel.name}`)
      
      try {
        const result = await sendAlert(alertContext)
        
        // Update alert log with result
        await supabase
          .from('alert_logs')
          .update({
            status: result.success ? 'sent' : 'failed',
            error_message: result.error || null,
            sent_at: result.success ? new Date().toISOString() : null,
          })
          .eq('id', alertLog.id)

        if (result.success) {
          console.log(`✅ Alert sent successfully via ${channel.type} (${result.messageId})`)
        } else {
          console.error(`❌ Alert failed via ${channel.type}: ${result.error}`)
        }
        
      } catch (error) {
        console.error(`Alert sending failed for channel ${channel.id}:`, error)
        
        // Update alert log with error
        await supabase
          .from('alert_logs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', alertLog.id)
      }
    }
    
  } catch (error) {
    console.error('Error in triggerAlerts:', error)
  }
}

function shouldTriggerForRule(rule: MonitorAlertRule, oldStatus: Monitor['status'], newStatus: Monitor['status']): boolean {
  // Check for down alerts
  if ((newStatus === 'down' || newStatus === 'timeout') && rule.alert_on_down) {
    return true
  }
  
  // Check for timeout alerts (if separate from down alerts)
  if (newStatus === 'timeout' && rule.alert_on_timeout) {
    return true
  }
  
  // Check for recovery alerts
  if ((oldStatus === 'down' || oldStatus === 'timeout') && newStatus === 'up' && rule.alert_on_up) {
    return true
  }
  
  return false
}

function countConsecutiveFailures(history: { status: string }[]): number {
  let count = 0
  for (const record of history) {
    if (record.status === 'down' || record.status === 'timeout') {
      count++
    } else {
      break
    }
  }
  return Math.max(count, 1) // At least 1 for the current failure
}

function generateAlertMessage(monitor: Monitor, triggerStatus: Monitor['status'], previousStatus: Monitor['status'] | null): string {
  const isRecovery = (previousStatus === 'down' || previousStatus === 'timeout') && triggerStatus === 'up'
  
  if (isRecovery) {
    return `Monitor "${monitor.name}" has recovered and is now ${triggerStatus.toUpperCase()}`
  }
  
  return `Monitor "${monitor.name}" is now ${triggerStatus.toUpperCase()}`
} 