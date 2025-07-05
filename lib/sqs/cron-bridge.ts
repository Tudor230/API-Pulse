// lib/sqs/cron-bridge.ts

import { createAdminClient } from '@/lib/supabase-admin'
import { Monitor } from '@/lib/supabase-types'
import { sendAlert, AlertContext } from '@/lib/alert-service'

/**
 * Bridge utility to use existing cron monitor checking logic
 * This allows gradual migration from cron to SQS processing
 */

interface CronCheckResult {
  id: string
  status: Monitor['status']
  responseTime: number | null
  success: boolean
  error?: string
}

/**
 * Process a single monitor using the existing cron logic
 * This is extracted from the original cron job for reuse
 */
export async function processMonitorViaCron(monitor: Monitor): Promise<CronCheckResult> {
  const supabase = createAdminClient()
  
  try {
    const result = await checkMonitor(monitor, supabase)
    return {
      id: monitor.id,
      status: result.status,
      responseTime: result.responseTime,
      success: true
    }
  } catch (error) {
    console.error(`Failed to process monitor ${monitor.id} via cron:`, error)
    return {
      id: monitor.id,
      status: monitor.status, // Keep previous status
      responseTime: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process multiple monitors using existing cron logic
 */
export async function processMonitorsViaCron(monitors: Monitor[]): Promise<CronCheckResult[]> {
  console.log(`🔧 Processing ${monitors.length} monitors via cron bridge`)
  
  const results = await Promise.allSettled(
    monitors.map(monitor => processMonitorViaCron(monitor))
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        id: monitors[index].id,
        status: monitors[index].status,
        responseTime: null,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Processing failed'
      }
    }
  })
}

// ========================================================================
// EXTRACTED FUNCTIONS FROM ORIGINAL CRON JOB
// These are copied to avoid circular dependencies
// ========================================================================

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

      console.log(`🚨 Triggering alert for monitor "${monitor.name}" via ${channel.channel_type}`)

      // Create alert context
      const alertContext: AlertContext = {
        monitor,
        channel,
        triggerStatus: newStatus,
        previousStatus: monitor.status,
        consecutiveFailures
      }

      // Send the alert
      try {
        await sendAlert(alertContext)
        
        console.log(`✅ Alert sent successfully for monitor ${monitor.id}`)
      } catch (alertError) {
        console.error(`❌ Failed to send alert for monitor ${monitor.id}:`, alertError)
      }
    }
  } catch (error) {
    console.error('Error in triggerAlerts:', error)
  }
}

function shouldTriggerForRule(rule: any, oldStatus: Monitor['status'], newStatus: Monitor['status']): boolean {
  switch (rule.alert_type) {
    case 'down':
      return oldStatus === 'up' && (newStatus === 'down' || newStatus === 'timeout')
    case 'up':
      return (oldStatus === 'down' || oldStatus === 'timeout') && newStatus === 'up'
    case 'timeout':
      return newStatus === 'timeout'
    default:
      return false
  }
}

function countConsecutiveFailures(history: { status: string }[]): number {
  let count = 0
  for (const entry of history) {
    if (entry.status === 'down' || entry.status === 'timeout') {
      count++
    } else {
      break
    }
  }
  return count
} 