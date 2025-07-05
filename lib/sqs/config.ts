import { 
  QueueConfig, 
  BatchProcessingConfig, 
  SQSConfig, 
  QUEUE_NAMES,
  retryConfigs
} from './types'

// Get visibility timeout from environment or use default
const getVisibilityTimeout = (defaultTimeout: number): number => {
  const envTimeout = process.env.SQS_VISIBILITY_TIMEOUT_SECONDS
  return envTimeout ? parseInt(envTimeout, 10) : defaultTimeout
}

// Queue configurations for different environments
export const queueConfigs: Record<string, QueueConfig> = {
  [QUEUE_NAMES.MONITOR_CHECKS]: {
    name: QUEUE_NAMES.MONITOR_CHECKS,
    type: 'fifo',
    visibilityTimeoutSeconds: getVisibilityTimeout(30),
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 3,
    deadLetterQueueName: QUEUE_NAMES.DLQ_FIFO,
    enableContentBasedDeduplication: true
  },
  [QUEUE_NAMES.PRIORITY_CHECKS]: {
    name: QUEUE_NAMES.PRIORITY_CHECKS,
    type: 'standard',
    visibilityTimeoutSeconds: getVisibilityTimeout(20),
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 3,
    deadLetterQueueName: QUEUE_NAMES.DLQ_STANDARD
  },
  [QUEUE_NAMES.ALERTS]: {
    name: QUEUE_NAMES.ALERTS,
    type: 'standard',
    visibilityTimeoutSeconds: getVisibilityTimeout(60),
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 5, // More retries for alerts
    deadLetterQueueName: QUEUE_NAMES.DLQ_STANDARD
  },
  [QUEUE_NAMES.SCHEDULER]: {
    name: QUEUE_NAMES.SCHEDULER,
    type: 'standard',
    visibilityTimeoutSeconds: getVisibilityTimeout(120),
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 2,
    deadLetterQueueName: QUEUE_NAMES.DLQ_STANDARD
  },
  [QUEUE_NAMES.DLQ_FIFO]: {
    name: QUEUE_NAMES.DLQ_FIFO,
    type: 'fifo',
    visibilityTimeoutSeconds: 300, // 5 minutes for manual review
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 1, // No retries from DLQ
    enableContentBasedDeduplication: true
  },
  [QUEUE_NAMES.DLQ_STANDARD]: {
    name: QUEUE_NAMES.DLQ_STANDARD,
    type: 'standard',
    visibilityTimeoutSeconds: 300, // 5 minutes for manual review
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 1 // No retries from DLQ
  }
}

// Default batch processing configurations - can be overridden by environment variables
const defaultBatchConfigs: Record<string, BatchProcessingConfig> = {
  [QUEUE_NAMES.MONITOR_CHECKS]: {
    batchSize: 10,
    waitTimeSeconds: 5, // Long polling
    parallelWorkers: 5,
    processingStrategy: 'independent'
  },
  [QUEUE_NAMES.PRIORITY_CHECKS]: {
    batchSize: 5,
    waitTimeSeconds: 2, // Faster polling for priority
    parallelWorkers: 3,
    processingStrategy: 'independent'
  },
  [QUEUE_NAMES.ALERTS]: {
    batchSize: 5,
    waitTimeSeconds: 2,
    parallelWorkers: 3,
    processingStrategy: 'sequential' // Prevent duplicate alerts
  },
  [QUEUE_NAMES.SCHEDULER]: {
    batchSize: 1,
    waitTimeSeconds: 10,
    parallelWorkers: 1,
    processingStrategy: 'sequential'
  },
  [QUEUE_NAMES.DLQ_FIFO]: {
    batchSize: 1,
    waitTimeSeconds: 20,
    parallelWorkers: 1,
    processingStrategy: 'sequential'
  },
  [QUEUE_NAMES.DLQ_STANDARD]: {
    batchSize: 1,
    waitTimeSeconds: 20,
    parallelWorkers: 1,
    processingStrategy: 'sequential'
  }
}

// Apply environment variable overrides to batch configurations
const applyEnvironmentOverrides = (configs: Record<string, BatchProcessingConfig>): Record<string, BatchProcessingConfig> => {
  const overrides = { ...configs }
  
  // Global overrides that apply to all queues
  const globalBatchSize = process.env.SQS_MAX_BATCH_SIZE ? parseInt(process.env.SQS_MAX_BATCH_SIZE, 10) : null
  const globalWaitTime = process.env.SQS_WAIT_TIME_SECONDS ? parseInt(process.env.SQS_WAIT_TIME_SECONDS, 10) : null
  const globalParallelWorkers = process.env.SQS_MAX_PARALLEL_WORKERS ? parseInt(process.env.SQS_MAX_PARALLEL_WORKERS, 10) : null
  
  // Apply global overrides to main processing queues (not DLQs)
  const mainQueues = [QUEUE_NAMES.MONITOR_CHECKS, QUEUE_NAMES.PRIORITY_CHECKS, QUEUE_NAMES.ALERTS]
  
  mainQueues.forEach(queueName => {
    if (overrides[queueName]) {
      if (globalBatchSize !== null) {
        overrides[queueName].batchSize = Math.min(globalBatchSize, 10) // SQS max is 10
      }
      if (globalWaitTime !== null) {
        overrides[queueName].waitTimeSeconds = Math.min(globalWaitTime, 20) // SQS max is 20
      }
      if (globalParallelWorkers !== null) {
        overrides[queueName].parallelWorkers = Math.max(globalParallelWorkers, 1) // At least 1
      }
    }
  })
  
  return overrides
}

// Batch processing configurations with environment variable overrides
export const batchConfigs: Record<string, BatchProcessingConfig> = applyEnvironmentOverrides(defaultBatchConfigs)

// Environment-specific configurations
const getEnvironmentConfig = (): Partial<SQSConfig> => {
  const env = process.env.NODE_ENV || 'development'
  
  if (env === 'production') {
    return {
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        // Use IAM roles in production
        roleArn: process.env.AWS_SQS_SERVICE_ROLE_ARN
      }
    }
  }
  
  if (process.env.APP_ENV === 'staging') {
    return {
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    }
  }
  
  if (env === 'development' || env === 'test') {
    return {
      region: 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret'
      }
    }
  }
  
  // Default fallback
  return {
    region: 'eu-central-1',
    credentials: {}
  }
}

// Complete SQS configuration
export const sqsConfig: SQSConfig = {
  ...getEnvironmentConfig(),
  region: getEnvironmentConfig().region!,
  queues: queueConfigs,
  batchConfigs,
  retryConfigs,
  credentials: getEnvironmentConfig().credentials!
}

// Environment-specific queue name prefixes
export const getQueueName = (baseName: string): string => {
  const env = process.env.NODE_ENV || 'development'
  const prefix = env === 'production' ? '' : `${env}-`
  return `${prefix}${baseName}`
}

// Get queue URL for AWS SDK
export const getQueueUrl = (queueName: string): string => {
  const accountId = process.env.AWS_ACCOUNT_ID
  const region = sqsConfig.region
  const fullQueueName = getQueueName(queueName)
  
  if (!accountId) {
    throw new Error('AWS_ACCOUNT_ID environment variable is required')
  }
  
  return `https://sqs.${region}.amazonaws.com/${accountId}/${fullQueueName}`
}

// Scaling thresholds for queue monitoring
export const scalingThresholds = {
  [QUEUE_NAMES.MONITOR_CHECKS]: {
    queueDepthScaleUp: 50,
    queueDepthScaleDown: 10,
    oldestMessageAgeWarning: 300, // 5 minutes
    oldestMessageAgeCritical: 900, // 15 minutes
    errorRateWarning: 0.05, // 5%
    errorRateCritical: 0.15 // 15%
  },
  [QUEUE_NAMES.PRIORITY_CHECKS]: {
    queueDepthScaleUp: 20,
    queueDepthScaleDown: 5,
    oldestMessageAgeWarning: 120, // 2 minutes
    oldestMessageAgeCritical: 300, // 5 minutes
    errorRateWarning: 0.03, // 3%
    errorRateCritical: 0.10 // 10%
  },
  [QUEUE_NAMES.ALERTS]: {
    queueDepthScaleUp: 30,
    queueDepthScaleDown: 5,
    oldestMessageAgeWarning: 180, // 3 minutes
    oldestMessageAgeCritical: 600, // 10 minutes
    errorRateWarning: 0.02, // 2%
    errorRateCritical: 0.08 // 8%
  },
  [QUEUE_NAMES.DLQ_FIFO]: {
    queueDepthWarning: 1,
    queueDepthCritical: 10,
    oldestMessageAgeWarning: 3600, // 1 hour
    oldestMessageAgeCritical: 21600 // 6 hours
  },
  [QUEUE_NAMES.DLQ_STANDARD]: {
    queueDepthWarning: 1,
    queueDepthCritical: 10,
    oldestMessageAgeWarning: 3600, // 1 hour
    oldestMessageAgeCritical: 21600 // 6 hours
  }
}

// Cost optimization settings
export const costOptimization = {
  // Use long polling to reduce API calls
  enableLongPolling: true,
  maxLongPollTime: 20, // seconds
  
  // Batch size optimization
  optimalBatchSizes: {
    [QUEUE_NAMES.MONITOR_CHECKS]: 10,
    [QUEUE_NAMES.PRIORITY_CHECKS]: 5,
    [QUEUE_NAMES.ALERTS]: 5,
    [QUEUE_NAMES.SCHEDULER]: 1
  },
  
  // Message retention optimization
  defaultRetentionPeriod: 1209600, // 14 days
  shortRetentionPeriod: 259200,    // 3 days for test environments
  
  // Visibility timeout optimization
  adaptiveVisibilityTimeout: true,
  visibilityTimeoutMargin: 10 // seconds buffer
}

// Health check configuration for queue monitoring
export const healthCheckConfig = {
  checkInterval: 60000, // 1 minute
  healthyThresholds: {
    maxQueueDepth: 100,
    maxOldestMessageAge: 600, // 10 minutes
    minSuccessRate: 0.95 // 95%
  },
  alertingEndpoints: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    pagerduty: process.env.PAGERDUTY_INTEGRATION_KEY
  }
}

// Feature flags for gradual migration
export const featureFlags = {
  enableSQSProcessing: process.env.ENABLE_SQS_PROCESSING === 'true',
  sqsProcessingPercentage: parseInt(process.env.SQS_PROCESSING_PERCENTAGE || '0', 10),
  enablePriorityQueue: process.env.ENABLE_PRIORITY_QUEUE === 'true',
  enableAlertQueue: process.env.ENABLE_ALERT_QUEUE === 'true',
  enableDLQProcessing: process.env.ENABLE_DLQ_PROCESSING === 'true',
  parallelCronAndSQS: process.env.PARALLEL_CRON_AND_SQS === 'true'
}

// Performance monitoring configuration
export const performanceConfig = {
  enableMetrics: process.env.ENABLE_SQS_METRICS === 'true',
  metricsInterval: 30000, // 30 seconds
  enableTracing: process.env.ENABLE_SQS_TRACING === 'true',
  tracingSampleRate: parseFloat(process.env.SQS_TRACING_SAMPLE_RATE || '0.1'),
  
  // Performance targets
  targets: {
    maxProcessingTime: 30000, // 30 seconds
    maxQueueTime: 300000,     // 5 minutes
    minThroughput: 10,        // messages per minute
    maxErrorRate: 0.05        // 5%
  }
}

// Security configuration
export const securityConfig = {
  enableMessageEncryption: process.env.ENABLE_SQS_ENCRYPTION === 'true',
  kmsKeyId: process.env.SQS_KMS_KEY_ID,
  enableMessageSigning: process.env.ENABLE_MESSAGE_SIGNING === 'true',
  messageSigningKey: process.env.MESSAGE_SIGNING_KEY,
  
  // Access control
  allowedSources: process.env.SQS_ALLOWED_SOURCES?.split(',') || ['api-pulse'],
  requireApiKey: process.env.SQS_REQUIRE_API_KEY === 'true',
  apiKeyHeader: 'X-API-PULSE-KEY',
  
  // Rate limiting
  enableRateLimit: process.env.ENABLE_SQS_RATE_LIMIT === 'true',
  rateLimitPerUser: parseInt(process.env.SQS_RATE_LIMIT_PER_USER || '1000', 10), // per hour
  rateLimitGlobal: parseInt(process.env.SQS_RATE_LIMIT_GLOBAL || '10000', 10)     // per hour
}

// Export configuration getter functions
export const getSQSConfig = (): SQSConfig => sqsConfig
export const getQueueConfig = (queueName: string): QueueConfig => queueConfigs[queueName]
export const getBatchConfig = (queueName: string): BatchProcessingConfig => batchConfigs[queueName] 