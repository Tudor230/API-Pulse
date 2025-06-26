import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { MonitoringHistory } from '@/lib/supabase-types'

type HistoryRecord = Pick<MonitoringHistory, 'checked_at' | 'status' | 'response_time'>

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const hoursStr = searchParams.get('hours') || '24'
  const hours = parseInt(hoursStr, 10)

  if (isNaN(hours) || hours <= 0 || hours > 720) {
    return NextResponse.json({ error: 'Invalid hours parameter' }, { status: 400 })
  }

  const monitorId = resolvedParams.id

  try {
    const { data: history, error: historyError } = await supabase
      .from('monitoring_history')
      .select('checked_at, status, response_time')
      .eq('monitor_id', monitorId)
      .gte('checked_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: true })

    if (historyError) {
      console.error('Error fetching monitoring history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // --- START DEBUG LOGGING ---
    console.log(`[Stats API] Monitor ID: ${monitorId}`);
    console.log(`[Stats API] Requested Hours: ${hours}`);
    console.log(`[Stats API] Found ${history?.length || 0} history records.`);
    // --- END DEBUG LOGGING ---

    // 1. Generate full uptime stats
    const uptimeStatsAccumulator = (history || []).reduce(
      (acc, record: HistoryRecord) => {
        acc.total_checks++
        if (record.status === 'up') {
          acc.successful_checks++
          if (record.response_time != null) {
            acc.total_response_time += record.response_time
          }
        } else if (record.status === 'down') {
          acc.failed_checks++
        } else if (record.status === 'timeout') {
          acc.timeout_checks++
        }
        return acc
      },
      {
        total_checks: 0,
        successful_checks: 0,
        failed_checks: 0,
        timeout_checks: 0,
        total_response_time: 0,
      }
    )

    const uptime_stats = {
      total_checks: uptimeStatsAccumulator.total_checks,
      successful_checks: uptimeStatsAccumulator.successful_checks,
      failed_checks: uptimeStatsAccumulator.failed_checks,
      timeout_checks: uptimeStatsAccumulator.timeout_checks,
      avg_response_time:
        uptimeStatsAccumulator.successful_checks > 0
          ? uptimeStatsAccumulator.total_response_time /
            uptimeStatsAccumulator.successful_checks
          : 0,
      uptime_percentage:
        uptimeStatsAccumulator.total_checks > 0
          ? (uptimeStatsAccumulator.successful_checks /
              uptimeStatsAccumulator.total_checks) *
            100
          : 0,
    }

    // 2. Generate response trend (it's just the raw relevant history)
    const response_trend = (history || []).map((h: HistoryRecord) => ({
      checked_at: h.checked_at,
      response_time: h.response_time,
      status: h.status,
    }))

    // 3. Generate hourly aggregated data
    const hourlyBuckets = (history || []).reduce(
      (
        acc: Record<string, { successful_checks: number; total_checks: number }>,
        record: HistoryRecord
      ) => {
        const date = new Date(record.checked_at)
        date.setMinutes(0, 0, 0)
        const hourBucket = date.toISOString()

        if (!acc[hourBucket]) {
          acc[hourBucket] = {
            successful_checks: 0,
            total_checks: 0,
          }
        }

        acc[hourBucket].total_checks++
        if (record.status === 'up') {
          acc[hourBucket].successful_checks++
        }
        return acc
      },
      {}
    )

    const hourly_data = Object.entries(hourlyBuckets).map(
      ([hour_bucket, bucket]) => ({
        hour_bucket,
        uptime_percentage:
          bucket.total_checks > 0
            ? (bucket.successful_checks / bucket.total_checks) * 100
            : 0,
        total_checks: bucket.total_checks,
      })
    )

    return NextResponse.json({
      uptime_stats,
      response_trend,
      hourly_data,
      period_hours: hours,
    })
  } catch (error) {
    console.error(`API error for monitor ${resolvedParams.id}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 