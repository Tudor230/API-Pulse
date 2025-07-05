// lib/sqs/test-client.ts

// Load environment variables from .env file
import { config } from 'dotenv'
config()

import { createSQSClient } from './index'
import { QUEUE_NAMES, MESSAGE_TYPES } from './types'

/**
 * Test utility to verify SQS client functionality
 * Run this to check if your SQS configuration is working
 */
export async function testSQSClient(): Promise<void> {
  console.log('🧪 Starting SQS client test...')
  
  try {
    // 1. Initialize client
    console.log('\n1️⃣ Initializing SQS client...')
    const client = await createSQSClient()
    console.log('✅ SQS client initialized successfully')

    // 2. Test queue connectivity
    console.log('\n2️⃣ Testing queue connectivity...')
    const health = await client.getSystemHealth()
    
    for (const [queueName, metrics] of Object.entries(health)) {
      if (metrics.queueDepth >= 0) {
        console.log(`✅ ${queueName}: Connected (${metrics.queueDepth} messages)`)
      } else {
        console.log(`❌ ${queueName}: Connection failed`)
      }
    }

    // 3. Test sending a message
    console.log('\n3️⃣ Testing message sending...')
    const testMessage = {
      messageId: `test-${Date.now()}`,
      messageType: MESSAGE_TYPES.MONITOR_CHECK,
      version: '1.0',
      timestamp: new Date().toISOString(),
      source: 'test-client',
      retryCount: 0,
      maxRetries: 3,
      payload: {
        monitorId: 'test-monitor-id',
        userId: 'test-user-id',
        monitorData: {
          name: 'Test Monitor',
          url: 'https://httpbin.org/status/200',
          expectedStatus: 'up' as any,
          intervalMinutes: 5,
          timeoutSeconds: 10
        },
        checkConfig: {
          priority: 'normal',
          scheduledAt: new Date().toISOString(),
          expectedDuration: 5000,
          userAgent: 'API-Pulse-Test/1.0'
        }
      }
    }

    const messageId = await client.sendMessage(
      QUEUE_NAMES.MONITOR_CHECKS,
      testMessage as any,
      {
        Priority: 'normal',
        UserId: 'test-user',
        IntervalMinutes: '5'
      }
    )
    console.log(`✅ Test message sent: ${messageId}`)

    // 4. Test receiving messages
    console.log('\n4️⃣ Testing message receiving...')
    const messages = await client.receiveMessages(QUEUE_NAMES.MONITOR_CHECKS, 1, 5)
    
    if (messages.length > 0) {
      console.log(`✅ Received ${messages.length} message(s)`)
      
      // Clean up - delete the test message
    //   const message = messages[0] as any
    //   if (message.receiptHandle) {
    //     await client.deleteMessage(QUEUE_NAMES.MONITOR_CHECKS, message.receiptHandle)
    //     console.log('🗑️ Test message cleaned up')
    //   }
    } else {
      console.log('ℹ️ No messages received (queue might be empty)')
    }

    // 5. Test queue metrics
    console.log('\n5️⃣ Testing queue metrics...')
    const metrics = await client.getQueueAttributes(QUEUE_NAMES.MONITOR_CHECKS)
    console.log(`📊 Queue depth: ${metrics.queueDepth}`)
    console.log(`⏰ Oldest message age: ${metrics.approximateAgeOfOldestMessage}s`)

    console.log('\n✅ All tests passed! SQS client is working correctly.')
    
    // Cleanup
    await client.destroy()

  } catch (error) {
    console.error('\n❌ SQS client test failed:', error)
    
    if (error instanceof Error && error.message.includes('Queue URL not found')) {
      console.log('\n💡 Troubleshooting tips:')
      console.log('  1. Make sure all SQS_QUEUE_* environment variables are set')
      console.log('  2. Check that queue URLs are correct')
      console.log('  3. Verify AWS credentials are configured')
      console.log('  4. Ensure queues exist in AWS')
    }
    
    throw error
  }
}

/**
 * Test specific queue health
 */
export async function testQueueHealth(queueName: string): Promise<void> {
  console.log(`🔍 Testing queue health: ${queueName}`)
  
  try {
    const client = await createSQSClient()
    const metrics = await client.getQueueAttributes(queueName)
    
    console.log(`📊 Queue Metrics for ${queueName}:`)
    console.log(`  - Queue Depth: ${metrics.queueDepth}`)
    console.log(`  - Oldest Message Age: ${metrics.approximateAgeOfOldestMessage}s`)
    console.log(`  - Status: ${metrics.queueDepth >= 0 ? 'Healthy' : 'Unhealthy'}`)
    
    await client.destroy()
    
  } catch (error) {
    console.error(`❌ Queue health check failed for ${queueName}:`, error)
    throw error
  }
}

/**
 * Environment configuration check
 */
export function checkEnvironmentConfig(): boolean {
  console.log('🔧 Checking environment configuration...')
  
  const requiredEnvVars = [
    'AWS_REGION',
    'SQS_QUEUE_MONITORCHECKS',
    'SQS_QUEUE_PRIORITYCHECKS',
    'SQS_QUEUE_ALERTPROCESSING',
    'SQS_QUEUE_SCHEDULER',
    'SQS_QUEUE_DLQ_FIFO',
    'SQS_QUEUE_DLQ_STANDARD'
  ]

  const optionalEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'SQS_MAX_BATCH_SIZE',
    'SQS_WAIT_TIME_SECONDS',
    'SQS_VISIBILITY_TIMEOUT_SECONDS',
    'SQS_MAX_PARALLEL_WORKERS'
  ]

  let allGood = true

  console.log('\n📋 Required environment variables:')
  for (const envVar of requiredEnvVars) {
    console.log(envVar)
    const value = process.env[envVar]
    if (value) {
      console.log(`  ✅ ${envVar}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`)
    } else {
      console.log(`  ❌ ${envVar}: NOT SET`)
      allGood = false
    }
  }

  console.log('\n📋 Optional environment variables:')
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar]
    if (value) {
      console.log(`  ✅ ${envVar}: ${value}`)
    } else {
      console.log(`  ⚪ ${envVar}: Not set (using defaults)`)
    }
  }

  if (allGood) {
    console.log('\n✅ Environment configuration looks good!')
  } else {
    console.log('\n❌ Some required environment variables are missing!')
    console.log('\n💡 Please check your .env file and ensure all required variables are set.')
  }

  return allGood
}

// CLI interface for manual testing
if (require.main === module) {
  const command = process.argv[2]
  
  switch (command) {
    case 'test':
      testSQSClient().catch(console.error)
      break
    case 'health':
      const queueName = process.argv[3] || QUEUE_NAMES.MONITOR_CHECKS
      testQueueHealth(queueName).catch(console.error)
      break
    case 'config':
      checkEnvironmentConfig()
      break
    default:
      console.log('Usage:')
      console.log('  npm run test-sqs test    - Run full SQS client test')
      console.log('  npm run test-sqs health  - Check queue health')
      console.log('  npm run test-sqs config  - Check environment config')
  }
} 