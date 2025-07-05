// lib/sqs/worker-service.ts

import { createAdminClient } from '@/lib/supabase-admin'
import { Monitor } from '@/lib/supabase-types'
import { sendAlert, AlertContext } from '@/lib/alert-service'
import {
  MonitorCheckMessage,
  AlertProcessingMessage,
  ProcessingResult,
  MonitorCheckResult,
  AlertProcessingResult,
  QUEUE_NAMES
} from './types'
import { batchConfigs } from './config'

interface WorkerStats {
  processed: number
  succeeded: number
  failed: number
  duration: number
  timestamp: string
}

export class SQSWorkerService {
  private supabase: any
  private queueClient: any
  private isRunning = false
  
  constructor(queueClient?: any) {
    this.supabase = createAdminClient()
    this.queueClient = queueClient
  }

  /**
   * Start processing messages from all SQS queues
   */
  async startWorker(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Worker already running')
      return
    }

    if (!this.queueClient) {
      throw new Error('Queue client not initialized')
    }

    this.isRunning = true
    console.log('🚀 Starting SQS worker service...')

    // Start processing different queue types concurrently
    const processingPromises = [
      this.processQueue(QUEUE_NAMES.MONITOR_CHECKS, this.processMonitorCheck.bind(this)),
      this.processQueue(QUEUE_NAMES.PRIORITY_CHECKS, this.processMonitorCheck.bind(this)),
      this.processQueue(QUEUE_NAMES.ALERTS, this.processAlert.bind(this))
    ]

    // Wait for any queue processor to complete (shouldn't happen in normal operation)
    await Promise.race(processingPromises)
    
    this.isRunning = false
    console.log('🛑 SQS worker service stopped')
  }

  /**
   * Stop the worker service
   */
  stopWorker(): void {
    console.log('🛑 Stopping SQS worker service...')
    this.isRunning = false
  }

  /**
   * Process messages from a specific queue
   */
  private async processQueue(
    queueName: string, 
    messageHandler: (message: any) => Promise<ProcessingResult>
  ): Promise<void> {
    const config = batchConfigs[queueName]
    if (!config) {
      throw new Error(`No configuration found for queue: ${queueName}`)
    }

    console.log(`📨 Starting processor for queue: ${queueName}`)

    while (this.isRunning) {
      try {
        // Receive messages from the queue
        const messages = await this.queueClient.receiveMessages(
          queueName,
          config.batchSize,
          config.waitTimeSeconds
        )

        if (messages && messages.length > 0) {
          console.log(`📋 Received ${messages.length} messages from ${queueName}`)
          
          // Process messages based on strategy
          if (config.processingStrategy === 'independent') {
            await this.processMessagesParallel(messages, messageHandler, queueName)
          } else {
            await this.processMessagesSequential(messages, messageHandler, queueName)
          }
        }

        // Small delay to prevent tight loops when queue is empty
        if (!messages || messages.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`❌ Error processing queue ${queueName}:`, error)
        
        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  /**
   * Process messages in parallel for better performance
   */
  private async processMessagesParallel(
    messages: any[],
    handler: (message: any) => Promise<ProcessingResult>,
    queueName: string
  ): Promise<void> {
    const config = batchConfigs[queueName]
    
    // Limit concurrency to prevent overwhelming the system
    const maxConcurrency = Math.min(config.parallelWorkers, messages.length)
    const chunks = this.chunkArray(messages, maxConcurrency)

    for (const chunk of chunks) {
      const processingPromises = chunk.map(async (message) => {
        try {
          const result = await handler(message)
          await this.handleMessageResult(message, result, queueName)
          return result
        } catch (error) {
          console.error(`❌ Failed to process message ${message.messageId}:`, error)
          await this.handleMessageError(message, error, queueName)
          return { success: false, messageId: message.messageId, processingTime: 0, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      })

      await Promise.allSettled(processingPromises)
    }
  }

  /**
   * Process messages sequentially for order-dependent operations
   */
  private async processMessagesSequential(
    messages: any[],
    handler: (message: any) => Promise<ProcessingResult>,
    queueName: string
  ): Promise<void> {
    for (const message of messages) {
      try {
        const result = await handler(message)
        await this.handleMessageResult(message, result, queueName)
      } catch (error) {
        console.error(`❌ Failed to process message ${message.messageId}:`, error)
        await this.handleMessageError(message, error, queueName)
      }
    }
  }

  /**
   * Process a monitor check message
   */
  private async processMonitorCheck(message: MonitorCheckMessage): Promise<MonitorCheckResult> {
    const startTime = Date.now()
    console.log(`🔍 Processing monitor check: ${message.payload.monitorData.name}`)

    try {
      // Fetch current monitor data from database
      const { data: monitor, error: fetchError } = await this.supabase
        .from('monitors')
        .select('*')
        .eq('id', message.payload.monitorId)
        .eq('user_id', message.payload.userId)
        .single()

      if (fetchError || !monitor) {
        throw new Error(`Monitor not found: ${message.payload.monitorId}`)
      }

      // Perform the actual health check
      const checkResult = await this.performHealthCheck(message.payload.monitorData)
      
      // Update monitor status in database
      await this.updateMonitorStatus(monitor, checkResult)
      
      // Save monitoring history
      await this.saveMonitoringHistory(monitor, checkResult)
      
      // Check if we need to trigger alerts
      const alertTriggered = await this.checkAndTriggerAlerts(monitor, checkResult)

      const processingTime = Date.now() - startTime
      console.log(`✅ Monitor check completed: ${message.payload.monitorData.name} (${processingTime}ms)`)

      return {
        success: true,
        messageId: message.messageId,
        processingTime,
        monitorId: message.payload.monitorId,
        status: checkResult.status,
        responseTime: checkResult.responseTime,
        statusChanged: checkResult.status !== monitor.status,
        alertTriggered
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ Monitor check failed: ${message.payload.monitorData.name}`, error)
      
      return {
        success: false,
        messageId: message.messageId,
        processingTime,
        monitorId: message.payload.monitorId,
        status: 'down',
        responseTime: null,
        statusChanged: false,
        alertTriggered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Perform the actual HTTP health check
   */
  private async performHealthCheck(monitorData: any): Promise<{
    status: Monitor['status']
    responseTime: number | null
    statusCode: number | null
    errorMessage: string | null
  }> {
    const startTime = Date.now()
    let status: Monitor['status'] = 'down'
    let statusCode: number | null = null
    let errorMessage: string | null = null

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), monitorData.timeoutSeconds * 1000)

      const response = await fetch(monitorData.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'API-Pulse-Monitor/1.0-SQS',
          ...monitorData.headers
        }
      })
      
      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      statusCode = response.status
      status = response.ok ? 'up' : 'down'
      
      return {
        status,
        responseTime,
        statusCode,
        errorMessage: null
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      if (error instanceof Error && error.name === 'AbortError') {
        status = 'timeout'
        errorMessage = 'Request timeout'
      } else {
        status = 'down'
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
      }

      return {
        status,
        responseTime,
        statusCode: null,
        errorMessage
      }
    }
  }

  /**
   * Update monitor status in database
   */
  private async updateMonitorStatus(monitor: Monitor, checkResult: any): Promise<void> {
    const nextCheckAt = new Date(Date.now() + (monitor.interval_minutes * 60 * 1000))

    const { error } = await this.supabase
      .from('monitors')
      .update({
        status: checkResult.status,
        last_checked_at: new Date().toISOString(),
        next_check_at: nextCheckAt.toISOString(),
        response_time: checkResult.responseTime
      })
      .eq('id', monitor.id)

    if (error) {
      throw new Error(`Failed to update monitor status: ${error.message}`)
    }
  }

  /**
   * Save monitoring history for analytics
   */
  private async saveMonitoringHistory(monitor: Monitor, checkResult: any): Promise<void> {
    const { error } = await this.supabase
      .from('monitoring_history')
      .insert({
        monitor_id: monitor.id,
        user_id: monitor.user_id,
        status: checkResult.status,
        response_time: checkResult.responseTime,
        status_code: checkResult.statusCode,
        error_message: checkResult.errorMessage,
        checked_at: new Date().toISOString()
      })

    if (error) {
      console.error(`Failed to save monitoring history for ${monitor.id}:`, error)
      // Don't throw - history is not critical
    }
  }

  /**
   * Check if alerts should be triggered and process them
   */
  private async checkAndTriggerAlerts(monitor: Monitor, checkResult: any): Promise<boolean> {
    const statusChanged = checkResult.status !== monitor.status
    
    if (!statusChanged) {
      return false
    }

    // Get alert rules for this monitor
    const { data: alertRules, error } = await this.supabase
      .from('monitor_alert_rules')
      .select(`
        *,
        notification_channels (*)
      `)
      .eq('monitor_id', monitor.id)
      .eq('is_active', true)
      .eq('notification_channels.is_active', true)
      .eq('notification_channels.is_verified', true)

    if (error || !alertRules || alertRules.length === 0) {
      return false
    }

    // Count consecutive failures
    const { data: recentHistory } = await this.supabase
      .from('monitoring_history')
      .select('status')
      .eq('monitor_id', monitor.id)
      .order('checked_at', { ascending: false })
      .limit(10)

    const consecutiveFailures = this.countConsecutiveFailures(recentHistory || [])

    // Process each alert rule
    let alertTriggered = false
    for (const rule of alertRules) {
      const shouldTrigger = this.shouldTriggerAlert(rule, monitor.status, checkResult.status)
      
      if (shouldTrigger && consecutiveFailures >= rule.consecutive_failures_threshold) {
        try {
          const alertContext: AlertContext = {
            monitor,
            channel: rule.notification_channels,
            triggerStatus: checkResult.status,
            previousStatus: monitor.status,
            consecutiveFailures,
            responseTime: checkResult.responseTime
          }

          await sendAlert(alertContext)
          alertTriggered = true
          console.log(`🚨 Alert sent for monitor ${monitor.name}`)
        } catch (alertError) {
          console.error(`Failed to send alert for monitor ${monitor.id}:`, alertError)
        }
      }
    }

    return alertTriggered
  }

  /**
   * Process alert messages
   */
  private async processAlert(message: AlertProcessingMessage): Promise<AlertProcessingResult> {
    const startTime = Date.now()
    console.log(`🔔 Processing alert: ${message.payload.metadata.monitorName}`)

    // Implementation for dedicated alert processing
    // This would handle complex alert logic, rate limiting, etc.
    
    return {
      success: true,
      messageId: message.messageId,
      processingTime: Date.now() - startTime,
      alertsSent: 0,
      alertsFailed: 0,
      channelsProcessed: []
    }
  }

  /**
   * Handle successful message processing
   */
  private async handleMessageResult(message: any, result: ProcessingResult, queueName: string): Promise<void> {
    if (result.success) {
      // Delete message from queue
      await this.queueClient.deleteMessage(queueName, message.receiptHandle)
      console.log(`✅ Message processed and deleted: ${message.messageId}`)
    } else {
      console.error(`❌ Message processing failed: ${message.messageId}`, result.error)
      // Message will be retried or sent to DLQ based on SQS configuration
    }
  }

  /**
   * Handle message processing errors
   */
  private async handleMessageError(message: any, error: any, queueName: string): Promise<void> {
    console.error(`❌ Message processing error: ${message.messageId}`, error)
    // SQS will handle retries automatically based on configuration
  }

  /**
   * Utility functions
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private shouldTriggerAlert(rule: any, oldStatus: Monitor['status'], newStatus: Monitor['status']): boolean {
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

  private countConsecutiveFailures(history: { status: string }[]): number {
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

  /**
   * Health check for worker service
   */
  async healthCheck(): Promise<{ healthy: boolean, stats: any }> {
    return {
      healthy: this.isRunning,
      stats: {
        isRunning: this.isRunning,
        queueClient: this.queueClient ? 'initialized' : 'not-initialized',
        timestamp: new Date().toISOString()
      }
    }
  }
} 