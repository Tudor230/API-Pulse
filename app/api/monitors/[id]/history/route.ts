import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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
  const hours = searchParams.get('hours') || '24'
  const limit = searchParams.get('limit') || '100'

  try {
    // Get monitoring history for the specific monitor
    const { data: history, error } = await supabase
      .from('monitoring_history')
      .select('*')
      .eq('monitor_id', resolvedParams.id)
      .gte('checked_at', new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      logger.apiError('GET', `/api/monitors/${resolvedParams.id}/history`, error, user?.id)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ history })
  } catch (error) {
    logger.apiError('GET', `/api/monitors/${resolvedParams.id}/history`, error, user?.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 