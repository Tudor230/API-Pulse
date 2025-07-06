import { createAdminClient } from '@/lib/supabase-admin'
import {
  UserSubscription,
  PlanLimits,
  SubscriptionPlan,
  AlertType,
  SubscriptionUsage
} from '@/lib/supabase-types'

export class SubscriptionService {
  private supabase = createAdminClient()

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error fetching user subscription:', error)
      return null
    }

    return data
  }

  /**
   * Get user's plan limits
   */
  async getUserPlanLimits(userId: string): Promise<PlanLimits | null> {
    const { data, error } = await this.supabase
      .rpc('get_user_plan_limits', { p_user_id: userId })

    if (error) {
      console.error('Error fetching user plan limits:', error)
      return null
    }

    return data?.[0] || null
  }

  /**
   * Check if user can create a new monitor
   */
  async canCreateMonitor(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('can_create_monitor', { p_user_id: userId })

    if (error) {
      console.error('Error checking monitor creation permission:', error)
      return false
    }

    return data || false
  }

  /**
   * Check if user can use a specific interval
   */
  async canUseInterval(userId: string, intervalMinutes: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('can_use_interval', {
        p_user_id: userId,
        p_interval_minutes: intervalMinutes
      })

    if (error) {
      console.error('Error checking interval permission:', error)
      return false
    }

    return data || false
  }

  /**
   * Check if user can create notification channel of specific type
   */
  async canCreateNotificationChannel(userId: string, type: AlertType): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('can_create_notification_channel', {
        p_user_id: userId,
        p_type: type
      })

    if (error) {
      console.error('Error checking notification channel creation permission:', error)
      return false
    }

    return data || false
  }

  /**
   * Check if user can access specific chart timeframe
   */
  async canAccessTimeframe(userId: string, timeframe: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('can_access_timeframe', {
        p_user_id: userId,
        p_timeframe: timeframe
      })

    if (error) {
      console.error('Error checking timeframe access permission:', error)
      return false
    }

    return data || false
  }

  /**
   * Update subscription usage
   */
  async updateSubscriptionUsage(
    userId: string,
    options: {
      monitorCount?: number
      notificationChannelsCount?: number
      apiCallsIncrement?: number
    } = {}
  ): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_subscription_usage', {
        p_user_id: userId,
        p_monitor_count: options.monitorCount,
        p_notification_channels_count: options.notificationChannelsCount,
        p_api_calls_increment: options.apiCallsIncrement || 0
      })

    if (error) {
      console.error('Error updating subscription usage:', error)
    }
  }

  /**
   * Get current subscription usage
   */
  async getSubscriptionUsage(userId: string): Promise<SubscriptionUsage | null> {
    const { data, error } = await this.supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .lte('period_start', new Date().toISOString())
      .or('period_end.is.null,period_end.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching subscription usage:', error)
      return null
    }

    return data
  }

  /**
   * Get all plan limits (for displaying pricing)
   */
  async getAllPlanLimits(): Promise<PlanLimits[]> {
    const { data, error } = await this.supabase
      .from('plan_limits')
      .select('*')
      .order('plan')

    if (error) {
      console.error('Error fetching plan limits:', error)
      return []
    }

    return data || []
  }

  /**
   * Check if user is on free plan
   */
  async isFreePlan(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    return subscription?.plan === 'free' || !subscription
  }

  /**
   * Check if user is on pro plan
   */
  async isProPlan(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    return subscription?.plan === 'pro' && subscription?.status === 'active'
  }

  /**
   * Get allowed intervals for user
   */
  async getAllowedIntervals(userId: string): Promise<number[]> {
    const limits = await this.getUserPlanLimits(userId)
    return limits?.allowed_intervals || [30, 60] // Default to free plan intervals
  }

  /**
   * Get allowed notification types for user
   */
  async getAllowedNotificationTypes(userId: string): Promise<AlertType[]> {
    const limits = await this.getUserPlanLimits(userId)
    return limits?.allowed_notification_types || ['email'] // Default to free plan
  }

  /**
   * Get allowed chart timeframes for user
   */
  async getAllowedTimeframes(userId: string): Promise<string[]> {
    const limits = await this.getUserPlanLimits(userId)
    return limits?.allowed_chart_timeframes || ['1h', '6h'] // Default to free plan
  }

  /**
   * Get current monitor count for user
   */
  async getCurrentMonitorCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('monitors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching monitor count:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Get current notification channels count for user
   */
  async getCurrentNotificationChannelsCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notification_channels')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching notification channels count:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Create default subscription for new user (called by trigger, but can be used manually)
   */
  async createDefaultSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan: 'free' as SubscriptionPlan,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating default subscription:', error)
      return null
    }

    // Create initial usage tracking
    if (data) {
      await this.supabase
        .from('subscription_usage')
        .insert({
          user_id: userId,
          subscription_id: data.id,
          monitor_count: 0,
          notification_channels_count: 0,
          api_calls_count: 0,
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
    }

    return data
  }
}

// Export a singleton instance
export const subscriptionService = new SubscriptionService()