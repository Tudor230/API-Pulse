import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const {
            alert_on_down,
            alert_on_up,
            alert_on_timeout,
            consecutive_failures_threshold,
            cooldown_minutes,
            is_active
        } = body

        // Validate that the alert rule belongs to the user
        const { data: existingRule, error: existingError } = await supabase
            .from('monitor_alert_rules')
            .select('id, user_id')
            .eq('id', resolvedParams.id)
            .single()

        if (existingError || !existingRule) {
            return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 })
        }

        if (existingRule.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Validate numeric constraints if provided
        if (consecutive_failures_threshold !== undefined && consecutive_failures_threshold < 1) {
            return NextResponse.json({
                error: 'Consecutive failures threshold must be at least 1'
            }, { status: 400 })
        }

        if (cooldown_minutes !== undefined && cooldown_minutes < 0) {
            return NextResponse.json({
                error: 'Cooldown minutes cannot be negative'
            }, { status: 400 })
        }

        // Update the alert rule
        const updateData: any = { updated_at: new Date().toISOString() }

        if (alert_on_down !== undefined) updateData.alert_on_down = alert_on_down
        if (alert_on_up !== undefined) updateData.alert_on_up = alert_on_up
        if (alert_on_timeout !== undefined) updateData.alert_on_timeout = alert_on_timeout
        if (consecutive_failures_threshold !== undefined) updateData.consecutive_failures_threshold = consecutive_failures_threshold
        if (cooldown_minutes !== undefined) updateData.cooldown_minutes = cooldown_minutes
        if (is_active !== undefined) updateData.is_active = is_active

        const { data: alertRule, error } = await supabase
            .from('monitor_alert_rules')
            .update(updateData)
            .eq('id', resolvedParams.id)
            .select(`
        *,
        monitors (id, name, url),
        notification_channels (id, name, type)
      `)
            .single()

        if (error) {
            logger.apiError('PATCH', `/api/alert-rules/${resolvedParams.id}`, error, user?.id)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ alertRule })
    } catch (error) {
        logger.apiError('PATCH', `/api/alert-rules/${resolvedParams.id}`, error, user?.id)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Validate that the alert rule belongs to the user
        const { data: existingRule, error: existingError } = await supabase
            .from('monitor_alert_rules')
            .select('id, user_id')
            .eq('id', resolvedParams.id)
            .single()

        if (existingError || !existingRule) {
            return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 })
        }

        if (existingRule.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Delete the alert rule
        const { error } = await supabase
            .from('monitor_alert_rules')
            .delete()
            .eq('id', resolvedParams.id)

        if (error) {
            logger.apiError('DELETE', `/api/alert-rules/${resolvedParams.id}`, error, user?.id)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        logger.apiError('DELETE', `/api/alert-rules/${resolvedParams.id}`, error, user?.id)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
