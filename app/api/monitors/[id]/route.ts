import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { subscriptionService } from '@/lib/subscription-service'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { url, name, interval_minutes, is_active } = body
        const monitorId = params.id

        // Validate required fields only if they are being updated
        if (url !== undefined && !url) {
            return NextResponse.json({ error: 'URL cannot be empty' }, { status: 400 })
        }
        if (name !== undefined && !name) {
            return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
        }

        // Validate URL format if URL is being updated
        if (url) {
            try {
                new URL(url)
            } catch {
                return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
            }
        }

        // Check if user can use the specified interval
        if (interval_minutes) {
            const canUseInterval = await subscriptionService.canUseInterval(user.id, interval_minutes)
            if (!canUseInterval) {
                const allowedIntervals = await subscriptionService.getAllowedIntervals(user.id)
                return NextResponse.json({
                    error: `Interval ${interval_minutes} minutes not allowed. Available intervals: ${allowedIntervals.join(', ')} minutes.`,
                    code: 'INTERVAL_NOT_ALLOWED',
                    allowedIntervals
                }, { status: 403 })
            }
        }

        // Verify monitor belongs to user
        const { data: existingMonitor, error: fetchError } = await supabase
            .from('monitors')
            .select('*')
            .eq('id', monitorId)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existingMonitor) {
            return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
        }

        // Calculate next check time if interval changed
        let nextCheckAt = existingMonitor.next_check_at
        if (interval_minutes && interval_minutes !== existingMonitor.interval_minutes) {
            nextCheckAt = new Date(Date.now() + (interval_minutes * 60 * 1000)).toISOString()
        }

        // Build update object with only provided fields
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        if (url !== undefined) updateData.url = url
        if (name !== undefined) updateData.name = name
        if (interval_minutes !== undefined) updateData.interval_minutes = interval_minutes
        if (is_active !== undefined) updateData.is_active = is_active
        if (nextCheckAt !== existingMonitor.next_check_at) updateData.next_check_at = nextCheckAt

        // Update monitor
        const { data: monitor, error } = await supabase
            .from('monitors')
            .update(updateData)
            .eq('id', monitorId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            logger.apiError('PATCH', `/api/monitors/${monitorId}`, error, user?.id)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ monitor }, { status: 200 })
    } catch (error) {
        logger.apiError('PATCH', `/api/monitors/${params.id}`, error, user?.id)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const monitorId = params.id

        // Verify monitor belongs to user
        const { data: existingMonitor, error: fetchError } = await supabase
            .from('monitors')
            .select('*')
            .eq('id', monitorId)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existingMonitor) {
            return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
        }

        // Delete monitor
        const { error } = await supabase
            .from('monitors')
            .delete()
            .eq('id', monitorId)
            .eq('user_id', user.id)

        if (error) {
            logger.apiError('DELETE', `/api/monitors/${monitorId}`, error, user?.id)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Update subscription usage after successful monitor deletion
        const currentMonitorCount = await subscriptionService.getCurrentMonitorCount(user.id)
        await subscriptionService.updateSubscriptionUsage(user.id, {
            monitorCount: currentMonitorCount
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        logger.apiError('DELETE', `/api/monitors/${params.id}`, error, user?.id)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
