// lib/sqs/index.ts

export { SQSClient } from './client'
export { MonitorSchedulerService } from './scheduler-service'
export { SQSWorkerService } from './worker-service'
export * from './types'
export * from './config'

import { SQSClient } from './client'

// Factory function to create and initialize SQS client
export async function createSQSClient(): Promise<SQSClient> {
  const client = new SQSClient()
  await client.initialize()
  return client
}

// Global client instance for reuse across the application
let globalSQSClient: SQSClient | null = null

/**
 * Get or create a global SQS client instance
 * This ensures we reuse the same client across the application
 */
export async function getSQSClient(): Promise<SQSClient> {
  if (!globalSQSClient) {
    console.log('🔄 Creating new global SQS client...')
    globalSQSClient = await createSQSClient()
  }
  return globalSQSClient
}

/**
 * Cleanup global SQS client
 */
export async function destroySQSClient(): Promise<void> {
  if (globalSQSClient) {
    await globalSQSClient.destroy()
    globalSQSClient = null
    console.log('🛑 Global SQS client destroyed')
  }
} 