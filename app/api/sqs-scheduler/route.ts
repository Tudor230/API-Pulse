// app/api/sqs-scheduler/route.ts

import { NextResponse } from 'next/server'
import { MonitorSchedulerService, getSQSClient } from '@/lib/sqs'

export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🚀 SQS Scheduler endpoint triggered')

  try {
    // Get SQS client instance
    const sqsClient = await getSQSClient()
    const schedulerService = new MonitorSchedulerService(sqsClient)
    
    // Execute the scheduling process
    const stats = await schedulerService.scheduleMonitorChecks()
    
    console.log('📊 Scheduler stats:', stats)

    return NextResponse.json({
      success: true,
      stats,
      message: 'Monitor scheduling completed'
    })

  } catch (error) {
    console.error('❌ SQS Scheduler error:', error)
    
    return NextResponse.json({ 
      error: 'Scheduler failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Health check endpoint
export async function POST(request: Request) {
  try {
    const schedulerService = new MonitorSchedulerService()
    const health = await schedulerService.healthCheck()
    
    return NextResponse.json({
      service: 'sqs-scheduler',
      ...health,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      service: 'sqs-scheduler',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 