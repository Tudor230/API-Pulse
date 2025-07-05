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

// Message attributes for SQS message filtering
export interface MonitorCheckAttributes {
  Priority: 'low' | 'normal' | 'high' | 'critical'
  UserId: string
  IntervalMinutes: string
}

export interface AlertAttributes {
  AlertType: 'down' | 'up' | 'timeout' | 'recovery'
  Severity: 'info' | 'warning' | 'error' | 'critical'
  ChannelType: 'email' | 'sms' | 'webhook'
  UserId: string
}

// Queue configuration interfaces
export interface QueueConfig {
  name: string
  type: 'fifo' | 'standard'
  visibilityTimeoutSeconds: number
  messageRetentionPeriod: number
  maxReceiveCount: number
  deadLetterQueueName?: string
  enableContentBasedDeduplication?: boolean
}

export interface BatchProcessingConfig {
  batchSize: number
  waitTimeSeconds: number
  parallelWorkers: number
  processingStrategy: 'independent' | 'sequential'
}

// Retry configuration for different message types
export interface RetryConfig {
  maxRetries: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
  baseDelaySeconds: number
  maxDelaySeconds: number
  jitterEnabled: boolean
}

export const retryConfigs: Record<string, RetryConfig> = {
  monitorCheck: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    baseDelaySeconds: 5,
    maxDelaySeconds: 300,
    jitterEnabled: true
  },
  alertProcessing: {
    maxRetries: 5,
    backoffStrategy: 'exponential',
    baseDelaySeconds: 10,
    maxDelaySeconds: 600,
    jitterEnabled: true
  },
  scheduler: {
    maxRetries: 2,
    backoffStrategy: 'fixed',
    baseDelaySeconds: 60,
    maxDelaySeconds: 60,
    jitterEnabled: false
  }
}

// Dead letter queue processing strategy
export interface DLQProcessingStrategy {
  reviewInterval: string
  autoRetryEnabled: boolean
  maxAutoRetries: number
  escalationRules: Array<{
    condition: string
    action: 'notify_admin' | 'auto_retry' | 'mark_failed'
  }>
}

// Performance monitoring interfaces
export interface SQSMetrics {
  queueDepth: number
  messagesReceived: number
  messagesDeleted: number
  messagesSent: number
  approximateAgeOfOldestMessage: number
  numberOfEmptyReceives: number
}

export interface ApplicationMetrics {
  monitorCheckDuration: number
  monitorCheckSuccessRate: number
  alertProcessingDuration: number
  alertDeliverySuccessRate: number
  deadLetterQueueMessages: number
}

// Worker processing result interfaces
export interface ProcessingResult {
  success: boolean
  messageId: string
  processingTime: number
  error?: string
  shouldRetry?: boolean
  metadata?: Record<string, any>
}

export interface MonitorCheckResult extends ProcessingResult {
  monitorId: string
  status: Monitor['status']
  responseTime: number | null
  statusChanged: boolean
  alertTriggered: boolean
}

export interface AlertProcessingResult extends ProcessingResult {
  alertsSent: number
  alertsFailed: number
  channelsProcessed: string[]
}

// Message handler interface
export interface MessageHandler<T extends BaseMessage> {
  messageType: string
  validate(message: any): message is T
  process(message: T): Promise<ProcessingResult>
  handleError(message: T, error: Error): Promise<void>
}

// Queue client interface for SQS operations
export interface QueueClient {
  sendMessage(queueName: string, message: SQSMessage, attributes?: Record<string, string>): Promise<string>
  receiveMessages(queueName: string, maxMessages?: number, waitTimeSeconds?: number): Promise<SQSMessage[]>
  deleteMessage(queueName: string, receiptHandle: string): Promise<void>
  changeMessageVisibility(queueName: string, receiptHandle: string, visibilityTimeout: number): Promise<void>
  getQueueAttributes(queueName: string): Promise<SQSMetrics>
}

// Database operations interface for SQS processing
export interface DatabaseOperations {
  // Read operations for scheduling
  getMonitorsDueForCheck(limit: number, offset?: number): Promise<Monitor[]>
  getAlertRulesForMonitor(monitorId: string): Promise<MonitorAlertRule[]>
  
  // Write operations from processing
  updateMonitorStatus(monitorId: string, status: Monitor['status'], responseTime: number | null, lastCheckedAt: string, nextCheckAt: string): Promise<void>
  saveMonitoringHistory(history: {
    monitor_id: string
    user_id: string
    status: Monitor['status']
    response_time: number | null
    status_code: number | null
    error_message: string | null
    checked_at: string
  }): Promise<void>
  createAlertLog(alert: {
    monitor_id: string
    monitor_alert_rule_id: string
    notification_channel_id: string
    user_id: string
    alert_type: AlertType
    status: 'pending' | 'sent' | 'failed'
    trigger_status: Monitor['status']
    previous_status: Monitor['status'] | null
    consecutive_failures: number
    message: string
    error_message?: string | null
  }): Promise<void>
}

// External service integrations
export interface ExternalServices {
  // Notification services
  sendEmail(to: string, subject: string, body: string): Promise<boolean>
  sendSMS(to: string, message: string): Promise<boolean>
  sendWebhook(url: string, payload: any): Promise<boolean>
  
  // Monitoring services
  recordMetric(metric: string, value: number, tags: Record<string, string>): void
  logEvent(event: string, data: any): void
}

// Logging interface
export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  service: string
  messageId: string
  correlationId?: string
  operation: string
  duration?: number
  error?: string
  metadata: Record<string, any>
}

export interface Logger {
  info(message: string, metadata?: Record<string, any>): void
  warn(message: string, metadata?: Record<string, any>): void
  error(message: string, error?: Error, metadata?: Record<string, any>): void
  debug(message: string, metadata?: Record<string, any>): void
}

// Configuration for different environments
export interface SQSConfig {
  region: string
  queues: Record<string, QueueConfig>
  batchConfigs: Record<string, BatchProcessingConfig>
  retryConfigs: Record<string, RetryConfig>
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

export interface QueueConfiguration {
  // Main queues
  monitorChecksQueue: string // FIFO queue
  priorityChecksQueue: string // Standard queue
  alertsQueue: string // Standard queue
  schedulerQueue: string // Standard queue
  
  // Dead Letter Queues
  monitorChecksDlq: string // FIFO DLQ for monitor checks
  standardDlq: string // Standard DLQ for priority checks, alerts, scheduler
  
  // Processing configuration
  batchSize: number
  visibilityTimeout: number
  maxReceiveCount: number
  
  // IAM and permissions
  workerRoleArn: string
  schedulerRoleArn: string
  
  // Feature flags
  enableSqsProcessing: boolean
  sqsProcessingPercentage: number
  parallelCronAndSqs: boolean
}

export interface QueueHealthStatus {
  queueName: string
  queueType: 'fifo' | 'standard'
  messagesAvailable: number
  messagesInFlight: number
  dlqMessages: number
  dlqName: string
  oldestMessageAge: number
  isHealthy: boolean
  lastChecked: string
}

export interface SystemHealthStatus {
  mainQueues: QueueHealthStatus[]
  deadLetterQueues: {
    fifo: QueueHealthStatus
    standard: QueueHealthStatus
  }
  overallHealth: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked: string
  alerts: string[]
} 