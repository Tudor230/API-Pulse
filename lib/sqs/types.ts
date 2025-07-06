import { Monitor, MonitorAlertRule, AlertType } from '../supabase-types'

// Base message interface for all SQS messages
export interface BaseMessage {
  messageId: string
  messageType: string
  version: string
  timestamp: string
  source: string
  retryCount: number
  maxRetries: number
  correlationId?: string
  metadata?: Record<string, any>
}

// Monitor check message for individual health checks
export interface MonitorCheckMessage extends BaseMessage {
  messageType: 'MONITOR_CHECK'
  payload: {
    monitorId: string
    userId: string
    monitorData: {
      name: string
      url: string
      expectedStatus: Monitor['status']
      intervalMinutes: number
      timeoutSeconds: number
      headers?: Record<string, string>
    }
    checkConfig: {
      priority: 'low' | 'normal' | 'high' | 'critical'
      scheduledAt: string
      expectedDuration: number
      userAgent: string
    }
    previousCheck?: {
      status: Monitor['status']
      responseTime: number
      checkedAt: string
    }
  }
}

// Bulk scheduling message for enqueuing multiple monitor checks
export interface BulkScheduleMessage extends BaseMessage {
  messageType: 'BULK_SCHEDULE'
  payload: {
    targetTime: string
    batchSize: number
    filters: {
      userId?: string
      priority?: string
      intervalMinutes?: number[]
    }
    operation: 'schedule_checks' | 'reschedule_failed' | 'priority_check'
  }
}

// Alert processing message for notification handling
export interface AlertProcessingMessage extends BaseMessage {
  messageType: 'ALERT_PROCESSING'
  payload: {
    monitorId: string
    userId: string
    alertContext: {
      oldStatus: Monitor['status']
      newStatus: Monitor['status']
      consecutiveFailures: number
      responseTime?: number
      errorMessage?: string
      statusChangeAt: string
    }
    alertRules: Array<{
      ruleId: string
      channelId: string
      channelType: AlertType
      shouldTrigger: boolean
      cooldownUntil?: string
    }>
    metadata: {
      monitorName: string
      monitorUrl: string
      checkDuration: number
    }
  }
}

// Dead letter queue message for failed message processing
export interface DLQMessage extends BaseMessage {
  messageType: 'DLQ_REVIEW'
  payload: {
    originalMessage: any
    failureReason: string
    failureTimestamp: string
    originalQueue: string
    retryHistory: Array<{
      attemptNumber: number
      failedAt: string
      errorMessage: string
    }>
  }
}

// Union type for all possible message types
export type SQSMessage =
  | MonitorCheckMessage
  | BulkScheduleMessage
  | AlertProcessingMessage
  | DLQMessage

// Performance monitoring interfaces
export interface SQSMetrics {
  queueDepth: number
  messagesReceived: number
  messagesDeleted: number
  messagesSent: number
  approximateAgeOfOldestMessage: number
  numberOfEmptyReceives: number
}



// Queue client interface for SQS operations
export interface QueueClient {
  sendMessage(queueName: string, message: SQSMessage, attributes?: Record<string, string>): Promise<string>
  receiveMessages(queueName: string, maxMessages?: number, waitTimeSeconds?: number): Promise<SQSMessage[]>
  deleteMessage(queueName: string, receiptHandle: string): Promise<void>
  changeMessageVisibility(queueName: string, receiptHandle: string, visibilityTimeout: number): Promise<void>
  getQueueAttributes(queueName: string): Promise<SQSMetrics>
}


// Configuration for different environments
export interface SQSConfig {
  region: string
  credentials: {
    accessKeyId?: string
    secretAccessKey?: string
    roleArn?: string
  }
}

// Queue names as constants
export const QUEUE_NAMES = {
  MONITOR_CHECKS: 'api-pulse-monitor-checks.fifo',
  PRIORITY_CHECKS: 'api-pulse-priority-checks',
  ALERTS: 'api-pulse-alerts',
  SCHEDULER: 'api-pulse-scheduler',
  DLQ_FIFO: 'api-pulse-dlq-fifo.fifo',
  DLQ_STANDARD: 'api-pulse-dlq-standard'
} as const

// Message types as constants
export const MESSAGE_TYPES = {
  MONITOR_CHECK: 'MONITOR_CHECK',
  BULK_SCHEDULE: 'BULK_SCHEDULE',
  ALERT_PROCESSING: 'ALERT_PROCESSING',
  DLQ_REVIEW: 'DLQ_REVIEW'
} as const

// Priority levels as constants
export const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const