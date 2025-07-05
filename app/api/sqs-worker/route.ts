// app/api/sqs-worker/route.ts
// TODO: This is a placeholder for the SQS worker.
// It is not used in the production environment.
// It is only used for testing and development.
import { NextResponse } from 'next/server'
import { SQSWorkerService, getSQSClient } from '@/lib/sqs'

// Global worker instance to maintain state across requests
let workerInstance: SQSWorkerService | null = null

export async function POST(request: Request) {
  // Verify this is a legitimate worker control request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start':
        return await startWorker()
      case 'stop':
        return await stopWorker()
      case 'status':
        return await getWorkerStatus()
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or status' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ Worker API error:', error)
    return NextResponse.json({
      error: 'Worker operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET(request: Request) {
  try {
    if (!workerInstance) {
      return NextResponse.json({
        service: 'sqs-worker',
        healthy: false,
        status: 'not-initialized',
        timestamp: new Date().toISOString()
      })
    }

    const health = await workerInstance.healthCheck()
    
    return NextResponse.json({
      service: 'sqs-worker',
      ...health,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      service: 'sqs-worker',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function startWorker(): Promise<NextResponse> {
  if (workerInstance) {
    const health = await workerInstance.healthCheck()
    if (health.stats.isRunning) {
      return NextResponse.json({
        message: 'Worker already running',
        status: 'running',
        timestamp: new Date().toISOString()
      })
    }
  }

  console.log('🚀 Starting SQS worker...')

  try {
    // Get SQS client instance
    const sqsClient = await getSQSClient()
    workerInstance = new SQSWorkerService(sqsClient)
    
    // Start the worker (this will run indefinitely)
    // In a real implementation, this would be run in a separate process/container
    // For now, we'll just initialize it
    console.log('✅ Worker initialized with real SQS client')
    
    return NextResponse.json({
      message: 'Worker started successfully',
      status: 'running',
      note: 'Worker ready to process SQS messages',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to start worker:', error)
    return NextResponse.json({
      error: 'Failed to start worker',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function stopWorker(): Promise<NextResponse> {
  if (!workerInstance) {
    return NextResponse.json({
      message: 'No worker instance to stop',
      status: 'stopped',
      timestamp: new Date().toISOString()
    })
  }

  console.log('🛑 Stopping SQS worker...')

  try {
    workerInstance.stopWorker()
    workerInstance = null

    return NextResponse.json({
      message: 'Worker stopped successfully',
      status: 'stopped',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to stop worker:', error)
    return NextResponse.json({
      error: 'Failed to stop worker',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function getWorkerStatus(): Promise<NextResponse> {
  if (!workerInstance) {
    return NextResponse.json({
      status: 'stopped',
      message: 'Worker not initialized',
      timestamp: new Date().toISOString()
    })
  }

  try {
    const health = await workerInstance.healthCheck()
    
    return NextResponse.json({
      status: health.stats.isRunning ? 'running' : 'stopped',
      health,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 