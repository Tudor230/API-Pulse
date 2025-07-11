// lib/sqs/client.ts

import {
  SQSClient as AWSSQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  GetQueueAttributesCommand,
  SendMessageBatchCommand,
  Message,
  QueueAttributeName
} from '@aws-sdk/client-sqs'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import {
  QueueClient,
  SQSMessage,
  SQSMetrics,
  QUEUE_NAMES
} from './types'
import { sqsConfig } from './config'
import { logger } from '@/lib/logger'

export class SQSClient implements QueueClient {
  private client: AWSSQSClient
  private queueUrls: Map<string, string> = new Map()
  private initialized = false

  constructor() {
    // Initialize AWS SQS client with credentials
    this.client = new AWSSQSClient({
      region: sqsConfig.region,
      credentials: this.getCredentials()
    })
  }

  /**
   * Initialize the client and load queue URLs
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    logger.info('Initializing SQS client...')

    try {
      // Load queue URLs from environment variables
      this.loadQueueUrls()

      // Verify connectivity by checking queue attributes
      await this.verifyQueues()

      this.initialized = true
      logger.info('SQS client initialized successfully')

    } catch (error) {
      logger.sqsError('initialization', error)
      throw new Error(`SQS client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send a message to the specified queue
   */
  async sendMessage(
    queueName: string,
    message: SQSMessage,
    attributes?: Record<string, string>
  ): Promise<string> {
    await this.ensureInitialized()

    const queueUrl = this.getQueueUrl(queueName)
    if (!queueUrl) {
      throw new Error(`Queue URL not found for: ${queueName}`)
    }

    try {
      logger.sqsOperation('send message', queueName, message.messageId)

      const messageBody = JSON.stringify(message)
      const messageAttributes = this.formatMessageAttributes(attributes)

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageAttributes: messageAttributes,
        // For FIFO queues, add MessageGroupId and MessageDeduplicationId
        ...(this.isFifoQueue(queueName) && {
          MessageGroupId: this.getMessageGroupId(message),
          MessageDeduplicationId: message.messageId
        })
      })

      const result = await this.client.send(command)

      if (!result.MessageId) {
        throw new Error('No MessageId returned from SQS')
      }

      logger.sqsOperation('message sent', queueName, result.MessageId)
      return result.MessageId

    } catch (error) {
      logger.sqsError('send message', error)
      throw new Error(`Send message failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Receive messages from the specified queue
   */
  async receiveMessages(
    queueName: string,
    maxMessages: number = 1,
    waitTimeSeconds: number = 0
  ): Promise<SQSMessage[]> {
    await this.ensureInitialized()

    const queueUrl = this.getQueueUrl(queueName)
    if (!queueUrl) {
      throw new Error(`Queue URL not found for: ${queueName}`)
    }

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS max is 10
        WaitTimeSeconds: Math.min(waitTimeSeconds, 20), // SQS max is 20
        MessageAttributeNames: ['All'],
        AttributeNames: ['All']
      })

      const result = await this.client.send(command)

      if (!result.Messages || result.Messages.length === 0) {
        return []
      }

      logger.sqsOperation('received messages', queueName, `${result.Messages.length}`)

      return result.Messages.map(msg => this.parseMessage(msg)).filter(Boolean) as SQSMessage[]

    } catch (error) {
      logger.sqsError('receive messages', error)
      throw new Error(`Receive messages failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a message from the queue
   */
  async deleteMessage(queueName: string, receiptHandle: string): Promise<void> {
    await this.ensureInitialized()

    const queueUrl = this.getQueueUrl(queueName)
    if (!queueUrl) {
      throw new Error(`Queue URL not found for: ${queueName}`)
    }

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })

      await this.client.send(command)
      logger.sqsOperation('message deleted', queueName)

    } catch (error) {
      logger.sqsError('delete message', error)
      throw new Error(`Delete message failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Change message visibility timeout
   */
  async changeMessageVisibility(
    queueName: string,
    receiptHandle: string,
    visibilityTimeout: number
  ): Promise<void> {
    await this.ensureInitialized()

    const queueUrl = this.getQueueUrl(queueName)
    if (!queueUrl) {
      throw new Error(`Queue URL not found for: ${queueName}`)
    }

    try {
      const command = new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeout
      })

      await this.client.send(command)
      logger.sqsOperation('message visibility changed', queueName, `${visibilityTimeout}s`)

    } catch (error) {
      logger.sqsError('change message visibility', error)
      throw new Error(`Change visibility failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get queue attributes and metrics
   */
  async getQueueAttributes(queueName: string): Promise<SQSMetrics> {
    await this.ensureInitialized()

    const queueUrl = this.getQueueUrl(queueName)
    if (!queueUrl) {
      throw new Error(`Queue URL not found for: ${queueName}`)
    }

    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [
          QueueAttributeName.ApproximateNumberOfMessages,
          QueueAttributeName.ApproximateNumberOfMessagesNotVisible,
          QueueAttributeName.ApproximateNumberOfMessagesDelayed
        ]
      })

      const result = await this.client.send(command)
      const attrs = result.Attributes || {}

      return {
        queueDepth: parseInt(attrs.ApproximateNumberOfMessages || '0'),
        messagesReceived: 0, // Not available from queue attributes
        messagesDeleted: 0, // Not available from queue attributes  
        messagesSent: 0, // Not available from queue attributes
        numberOfEmptyReceives: 0, // Not available from queue attributes
        approximateAgeOfOldestMessage: 0 // Not available from queue attributes
      }

    } catch (error) {
      logger.sqsError('get queue attributes', error)
      throw new Error(`Get queue attributes failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send multiple messages in a batch (up to 10)
   */
  async sendMessageBatch(
    queueName: string,
    messages: Array<{ message: SQSMessage, attributes?: Record<string, string> }>
  ): Promise<string[]> {
    await this.ensureInitialized()

    const queueUrl = this.getQueueUrl(queueName)
    if (!queueUrl) {
      throw new Error(`Queue URL not found for: ${queueName}`)
    }

    if (messages.length === 0 || messages.length > 10) {
      throw new Error('Batch size must be between 1 and 10 messages')
    }

    try {
      logger.sqsOperation('sending batch of messages', queueName, `${messages.length}`)

      const entries = messages.map((msg, index) => ({
        Id: `msg-${index}`,
        MessageBody: JSON.stringify(msg.message),
        MessageAttributes: this.formatMessageAttributes(msg.attributes),
        ...(this.isFifoQueue(queueName) && {
          MessageGroupId: this.getMessageGroupId(msg.message),
          MessageDeduplicationId: msg.message.messageId
        })
      }))

      const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries
      })

      const result = await this.client.send(command)

      if (result.Failed && result.Failed.length > 0) {
        logger.sqsError('batch send partial failure', { failedCount: result.Failed.length, details: result.Failed }, queueName)
      }

      const messageIds = result.Successful?.map(s => s.MessageId).filter(Boolean) as string[] || []
      logger.sqsOperation('batch sent', queueName, `${messageIds.length} successful, ${result.Failed?.length || 0} failed`)

      return messageIds

    } catch (error) {
      logger.sqsError('send message batch', error, queueName)
      throw new Error(`Send batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get health status of all configured queues
   */
  async getSystemHealth(): Promise<Record<string, SQSMetrics>> {
    await this.ensureInitialized()

    const health: Record<string, SQSMetrics> = {}

    for (const queueName of this.queueUrls.keys()) {
      try {
        health[queueName] = await this.getQueueAttributes(queueName)
      } catch (error) {
        logger.sqsError('health check', error, queueName)
        health[queueName] = {
          queueDepth: -1,
          messagesReceived: -1,
          messagesDeleted: -1,
          messagesSent: -1,
          approximateAgeOfOldestMessage: -1,
          numberOfEmptyReceives: -1
        }
      }
    }

    return health
  }

  /**
   * Private helper methods
   */
  private getCredentials() {
    // Use environment variables or IAM roles
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    }

    // Use default provider chain (IAM roles, environment, etc.)
    return fromNodeProviderChain()
  }

  private loadQueueUrls(): void {
    const queueConfig: Record<string, string> = {
      [QUEUE_NAMES.MONITOR_CHECKS]: process.env.SQS_QUEUE_MONITORCHECKS || '',
      [QUEUE_NAMES.PRIORITY_CHECKS]: process.env.SQS_QUEUE_PRIORITYCHECKS || '',
      [QUEUE_NAMES.ALERTS]: process.env.SQS_QUEUE_ALERTPROCESSING || '',
      [QUEUE_NAMES.SCHEDULER]: process.env.SQS_QUEUE_SCHEDULER || '',
      [QUEUE_NAMES.DLQ_FIFO]: process.env.SQS_QUEUE_DLQ_FIFO || '',
      [QUEUE_NAMES.DLQ_STANDARD]: process.env.SQS_QUEUE_DLQ_STANDARD || ''
    }

    for (const [queueName, queueUrl] of Object.entries(queueConfig)) {
      if (queueUrl) {
        this.queueUrls.set(queueName, queueUrl)
        logger.debug('Queue URL loaded', { queueName })
      } else {
        logger.warn('Missing queue URL for', { queueName })
      }
    }

    if (this.queueUrls.size === 0) {
      throw new Error('No queue URLs configured. Check environment variables.')
    }
  }

  private async verifyQueues(): Promise<void> {
    logger.info('Verifying queue connectivity')

    // Simple verification - just check one queue to ensure we can connect
    const firstQueueName = Array.from(this.queueUrls.keys())[0]
    if (!firstQueueName) {
      throw new Error('No queues configured for verification')
    }

    try {
      const queueUrl = this.getQueueUrl(firstQueueName)
      if (!queueUrl) {
        throw new Error(`Queue URL not found for: ${firstQueueName}`)
      }

      // Simple connectivity test
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [QueueAttributeName.ApproximateNumberOfMessages]
      })

      await this.client.send(command)
      logger.info('Queue connectivity verified', { queueName: firstQueueName })

    } catch (error) {
      logger.sqsError('connectivity verification', error)
      throw new Error(`Queue connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getQueueUrl(queueName: string): string | undefined {
    return this.queueUrls.get(queueName)
  }

  private isFifoQueue(queueName: string): boolean {
    return queueName.endsWith('.fifo')
  }

  private getMessageGroupId(message: SQSMessage): string {
    // For FIFO queues, group messages by type or user for ordering
    if (message.messageType === 'MONITOR_CHECK') {
      return `monitor-checks`
    }
    return 'default'
  }

  private formatMessageAttributes(attributes?: Record<string, string>): Record<string, any> | undefined {
    if (!attributes) return undefined

    const formatted: Record<string, any> = {}
    for (const [key, value] of Object.entries(attributes)) {
      formatted[key] = {
        DataType: 'String',
        StringValue: value
      }
    }
    return formatted
  }

  private parseMessage(msg: Message): SQSMessage | null {
    try {
      if (!msg.Body || !msg.ReceiptHandle) {
        logger.warn('Invalid message format - missing body or receipt handle')
        return null
      }

      const parsed = JSON.parse(msg.Body) as SQSMessage

      // Add receipt handle for message deletion
      (parsed as any).receiptHandle = msg.ReceiptHandle

      return parsed
    } catch (error) {
      logger.error('Failed to parse message', { error: (error instanceof Error ? error.message : String(error)) })
      return null
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * Cleanup and close connections
   */
  async destroy(): Promise<void> {
    logger.info('Destroying SQS client')
    this.initialized = false
    this.queueUrls.clear()
    // AWS SDK v3 clients don't need explicit cleanup
  }
} 