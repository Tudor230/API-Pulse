// lib/sqs/scheduler-service.ts

import { createAdminClient } from '@/lib/supabase-admin'
import { Monitor } from '@/lib/supabase-types'
import { 
  MonitorCheckMessage, 
  BulkScheduleMessage,
  QUEUE_NAMES, 
  MESSAGE_TYPES,
  PRIORITY_LEVELS 
} from './types'
import { featureFlags } from './config'

interface SchedulerStats {
  totalMonitors: number
  sqsEnqueued: number
  cronProcessed: number
  errors: number
  timestamp: string
}

export class MonitorSchedulerService {
  private supabase: any
  private queueClient: any // Will be injected
  
  constructor(queueClient?: any) {
    this.supabase = createAdminClient()
    this.queueClient = queueClient
  }

  /**
   * Main scheduler method - enqueues ALL monitors to SQS for processing
   * Replaces traditional cron job processing entirely
   */
  async scheduleMonitorChecks(): Promise<SchedulerStats> {
    const startTime = Date.now()
    console.log(`🕐 Starting SQS-only monitor scheduling...`)

    try {
      // Get monitors that are due for checking
      const monitors = await this.getMonitorsDueForCheck()
      
      if (!monitors || monitors.length === 0) {
        console.log('No monitors due for checking')
        return {
          totalMonitors: 0,
          sqsEnqueued: 0,
          cronProcessed: 0,
          errors: 0,
          timestamp: new Date().toISOString()
        }
      }

      console.log(`📨 Enqueueing all ${monitors.length} monitors to SQS`)

      // Enqueue ALL monitors to SQS - no cron fallback
      const sqsResult = await this.enqueueMonitorsToSQS(monitors)

      const duration = Date.now() - startTime
      console.log(`✅ SQS scheduling completed in ${duration}ms: ${sqsResult.enqueued} enqueued, ${sqsResult.errors} errors`)

      return {
        totalMonitors: monitors.length,
        sqsEnqueued: sqsResult.enqueued,
        cronProcessed: 0, // No cron processing
        errors: sqsResult.errors,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Scheduler error:', error)
      throw error
    }
  }

  /**
   * Get monitors that are due for checking from database
   */
  private async getMonitorsDueForCheck(limit: number = 50): Promise<Monitor[]> {
    const { data: monitors, error } = await this.supabase
      .from('monitors')
      .select('*')
      .lt('next_check_at', new Date().toISOString())
      .eq('is_active', true)
      .order('next_check_at', { ascending: true }) // Check oldest first
      .limit(limit)

    if (error) {
      console.error('Error fetching monitors:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    return monitors || []
  }



  /**
   * Enqueue monitors to appropriate SQS queues based on priority
   */
  private async enqueueMonitorsToSQS(monitors: Monitor[]): Promise<{ enqueued: number, errors: number }> {
    if (!this.queueClient) {
      throw new Error('Queue client not initialized')
    }

    let enqueued = 0
    let errors = 0

    // Group monitors by priority for better queue distribution
    const priorityGroups = this.groupMonitorsByPriority(monitors)

    for (const [priority, priorityMonitors] of Object.entries(priorityGroups)) {
      console.log(`📋 Enqueueing ${priorityMonitors.length} ${priority} priority monitors`)

      for (const monitor of priorityMonitors) {
        try {
          const message = this.createMonitorCheckMessage(monitor, priority as keyof typeof PRIORITY_LEVELS)
          const queueName = this.selectQueueForPriority(priority as keyof typeof PRIORITY_LEVELS)
          
          await this.queueClient.sendMessage(queueName, message, {
            Priority: priority,
            UserId: monitor.user_id,
            IntervalMinutes: monitor.interval_minutes.toString()
          })

          // Update next_check_at to prevent duplicate processing
          await this.updateMonitorNextCheck(monitor)
          
          enqueued++
          
        } catch (error) {
          console.error(`❌ Failed to enqueue monitor ${monitor.id}:`, error)
          errors++
        }
      }
    }

    return { enqueued, errors }
  }

  /**
   * Group monitors by priority based on interval and previous status
   */
  private groupMonitorsByPriority(monitors: Monitor[]): Record<string, Monitor[]> {
    const groups: Record<string, Monitor[]> = {
      critical: [],
      high: [],
      normal: [],
      low: []
    }

    for (const monitor of monitors) {
      let priority = 'normal'

      // Critical: Failed monitors or very frequent checks
      if (monitor.status === 'down' || monitor.status === 'timeout' || monitor.interval_minutes <= 1) {
        priority = 'critical'
      }
      // High: Recently failed or frequent checks
      else if (monitor.interval_minutes <= 5) {
        priority = 'high'
      }
      // Low: Infrequent checks for stable monitors
      else if (monitor.interval_minutes >= 30 && monitor.status === 'up') {
        priority = 'low'
      }
      // Normal: Everything else
      else {
        priority = 'normal'
      }

      groups[priority].push(monitor)
    }

    return groups
  }

  /**
   * Select appropriate queue based on priority
   */
  private selectQueueForPriority(priority: string): string {
    switch (priority) {
      case 'critical':
      case 'high':
        return QUEUE_NAMES.PRIORITY_CHECKS
      default:
        return QUEUE_NAMES.MONITOR_CHECKS
    }
  }

  /**
   * Create SQS message for monitor check
   */
  private createMonitorCheckMessage(monitor: Monitor, priority: keyof typeof PRIORITY_LEVELS): MonitorCheckMessage {
    return {
      messageId: `monitor-${monitor.id}-${Date.now()}`,
      messageType: MESSAGE_TYPES.MONITOR_CHECK,
      version: '1.0',
      timestamp: new Date().toISOString(),
      source: 'scheduler-service',
      retryCount: 0,
      maxRetries: 3,
      correlationId: `schedule-${new Date().toISOString().slice(0, 10)}`,
      
      payload: {
        monitorId: monitor.id,
        userId: monitor.user_id,
        monitorData: {
          name: monitor.name,
          url: monitor.url,
          expectedStatus: monitor.status,
          intervalMinutes: monitor.interval_minutes,
          timeoutSeconds: 10,
          headers: undefined // TODO: Add headers support to Monitor type if needed
        },
        checkConfig: {
          priority: PRIORITY_LEVELS[priority.toUpperCase() as keyof typeof PRIORITY_LEVELS],
          scheduledAt: new Date().toISOString(),
          expectedDuration: 15000, // 15 seconds max
          userAgent: 'API-Pulse-Monitor/1.0-SQS'
        },
        previousCheck: {
          status: monitor.status,
          responseTime: monitor.response_time || 0,
          checkedAt: monitor.last_checked_at || new Date().toISOString()
        }
      }
    }
  }

  /**
   * Update monitor's next_check_at to prevent duplicate processing
   */
  private async updateMonitorNextCheck(monitor: Monitor): Promise<void> {
    const nextCheckAt = new Date(Date.now() + (monitor.interval_minutes * 60 * 1000))

    const { error } = await this.supabase
      .from('monitors')
      .update({ 
        next_check_at: nextCheckAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', monitor.id)

    if (error) {
      console.error(`Failed to update next_check_at for monitor ${monitor.id}:`, error)
      // Don't throw - this is not critical for enqueueing
    }
  }

  /**
   * Create bulk schedule message for batch operations
   */
  createBulkScheduleMessage(operation: 'schedule_checks' | 'reschedule_failed' | 'priority_check', filters: any = {}): BulkScheduleMessage {
    return {
      messageId: `bulk-${operation}-${Date.now()}`,
      messageType: MESSAGE_TYPES.BULK_SCHEDULE,
      version: '1.0',
      timestamp: new Date().toISOString(),
      source: 'scheduler-service',
      retryCount: 0,
      maxRetries: 2,
      
      payload: {
        targetTime: new Date().toISOString(),
        batchSize: 50,
        filters,
        operation
      }
    }
  }

  /**
   * Health check for scheduler service
   */
  async healthCheck(): Promise<{ healthy: boolean, stats: any }> {
    try {
      const { data: monitorCount } = await this.supabase
        .from('monitors')
        .select('id', { count: 'exact' })
        .eq('is_active', true)

      const { data: dueCount } = await this.supabase
        .from('monitors')
        .select('id', { count: 'exact' })
        .lt('next_check_at', new Date().toISOString())
        .eq('is_active', true)

      return {
        healthy: true,
        stats: {
          totalActiveMonitors: monitorCount || 0,
          monitorsDue: dueCount || 0,
          processingMode: 'sqs-only',
          queueClient: this.queueClient ? 'initialized' : 'not-initialized'
        }
      }
    } catch (error) {
      return {
        healthy: false,
        stats: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
} 