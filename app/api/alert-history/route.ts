import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const url = new URL(request.url)
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')
        const monitorId = url.searchParams.get('monitor_id')
        const status = url.searchParams.get('status') as 'pending' | 'sent' | 'failed' | 'queued' | null
        const alertType = url.searchParams.get('alert_type') as 'email' | 'sms' | 'webhook' | null

        // Build the query
        let query = supabase
            .from('alert_logs')
            .select(`
        *,
        monitors (id, name, url),
        notification_channels (id, name, type)
      `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Apply filters
        if (monitorId) {
            query = query.eq('monitor_id', monitorId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        if (alertType) {
            query = query.eq('alert_type', alertType)
        }

        const { data: alertLogs, error } = await query

        if (error) {
            logger.apiError('GET', '/api/alert-history', error, user?.id)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get total count for pagination
        let countQuery = supabase
            .from('alert_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (monitorId) {
            countQuery = countQuery.eq('monitor_id', monitorId)
        }

        if (status) {
            countQuery = countQuery.eq('status', status)
        }

        if (alertType) {
            countQuery = countQuery.eq('alert_type', alertType)
        }

        const { count, error: countError } = await countQuery

        if (countError) {
            logger.apiError('GET', '/api/alert-history (count)', countError, user?.id)
            return NextResponse.json({ error: countError.message }, { status: 500 })
        }

        return NextResponse.json({
            alertLogs: alertLogs || [],
            total: count || 0,
            limit,
            offset
        })
    } catch (error) {
        logger.apiError('GET', '/api/alert-history', error, user?.id)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
