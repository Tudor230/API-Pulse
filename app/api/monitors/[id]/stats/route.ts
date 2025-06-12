import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    // Get uptime statistics
    const { data: uptimeStats, error: uptimeError } = await supabase
      .rpc('get_uptime_stats', {
        p_monitor_id: resolvedParams.id,
        p_hours: hours
      })

    if (uptimeError) {
      console.error('Error fetching uptime stats:', uptimeError)
      return NextResponse.json({ error: uptimeError.message }, { status: 500 })
    }

    // Get response time trend
    const { data: responseTrend, error: trendError } = await supabase
      .rpc('get_response_time_trend', {
        p_monitor_id: resolvedParams.id,
        p_hours: hours
      })

    if (trendError) {
      console.error('Error fetching response trend:', trendError)
      return NextResponse.json({ error: trendError.message }, { status: 500 })
    }

    // Get hourly aggregated data for charts
    const { data: hourlyData, error: hourlyError } = await supabase
      .rpc('get_hourly_monitor_data', {
        p_monitor_id: resolvedParams.id,
        p_hours: hours
      })

    if (hourlyError) {
      console.error('Error fetching hourly data:', hourlyError)
      return NextResponse.json({ error: hourlyError.message }, { status: 500 })
    }

    return NextResponse.json({
      uptime_stats: uptimeStats?.[0] || null,
      response_trend: responseTrend || [],
      hourly_data: hourlyData || [],
      period_hours: hours
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 