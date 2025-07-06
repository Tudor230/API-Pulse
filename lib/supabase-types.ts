// Type definitions for our database schema
export interface Monitor {
  id: string
  user_id: string
  name: string
  url: string
  status: 'up' | 'down' | 'timeout' | 'pending' | 'unknown'
  interval_minutes: number
  is_active: boolean
  response_time: number | null
  last_checked_at: string | null
  next_check_at: string | null
  created_at: string
  updated_at: string
}

export interface MonitoringHistory {
  id: string
  monitor_id: string
  user_id: string
  status: 'up' | 'down' | 'timeout' | 'unknown'
  response_time: number | null
  status_code: number | null
  error_message: string | null
  checked_at: string
  created_at: string
}

export interface MonitorStatistics {
  monitor_id: string
  user_id: string
  name: string
  url: string
  current_status: 'up' | 'down' | 'pending' | 'unknown' | 'timeout'
  last_checked_at: string | null
  uptime_24h: number
  avg_response_time_24h: number
  total_checks_24h: number
  incidents_24h: number
}

export interface ResponseTimeTrend {
  checked_at: string
  response_time: number | null
  status: string
}

export interface UptimeStats {
  total_checks: number
  successful_checks: number
  failed_checks: number
  timeout_checks: number
  uptime_percentage: number
  avg_response_time: number
}

export interface HourlyMonitorData {
  hour_bucket: string
  avg_response_time: number
  uptime_percentage: number
  total_checks: number
}

// Alert System Types
export type AlertType = 'email' | 'sms' | 'webhook'
export type AlertStatus = 'pending' | 'sent' | 'failed' | 'queued'

export interface NotificationChannel {
  id: string
  user_id: string
  name: string
  type: AlertType
  config: {
    email?: string
    phone?: string
    webhook_url?: string
    [key: string]: any
  }
  is_active: boolean
  is_verified: boolean
  verification_token: string | null
  verification_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface MonitorAlertRule {
  id: string
  monitor_id: string
  notification_channel_id: string
  user_id: string
  alert_on_down: boolean
  alert_on_up: boolean
  alert_on_timeout: boolean
  consecutive_failures_threshold: number
  cooldown_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AlertLog {
  id: string
  monitor_id: string
  monitor_alert_rule_id: string | null
  notification_channel_id: string | null
  user_id: string
  alert_type: AlertType
  status: AlertStatus
  trigger_status: Monitor['status']
  previous_status: Monitor['status'] | null
  consecutive_failures: number
  message: string
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export interface RecentAlert {
  id: string
  alert_type: AlertType
  status: AlertStatus
  trigger_status: Monitor['status']
  message: string
  sent_at: string | null
  created_at: string
}

// Subscription System Types
export type SubscriptionPlan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'

export interface UserSubscription {
  id: string
  user_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  trial_start: string | null
  trial_end: string | null
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionUsage {
  id: string
  user_id: string
  subscription_id: string
  monitor_count: number
  notification_channels_count: number
  api_calls_count: number
  period_start: string
  period_end: string | null
  created_at: string
  updated_at: string
}

export interface PlanLimits {
  id: string
  plan: SubscriptionPlan
  max_monitors: number
  allowed_intervals: number[]
  allowed_notification_types: AlertType[]
  max_notification_channels: number
  allowed_chart_timeframes: string[]
  api_rate_limit: number
  priority_support: boolean
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      monitors: {
        Row: Monitor
        Insert: Omit<Monitor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Monitor, 'id' | 'created_at' | 'updated_at'>>
      }
      monitoring_history: {
        Row: MonitoringHistory
        Insert: Omit<MonitoringHistory, 'id' | 'created_at'>
        Update: Partial<Omit<MonitoringHistory, 'id' | 'created_at'>>
      }
      notification_channels: {
        Row: NotificationChannel
        Insert: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>>
      }
      monitor_alert_rules: {
        Row: MonitorAlertRule
        Insert: Omit<MonitorAlertRule, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MonitorAlertRule, 'id' | 'created_at' | 'updated_at'>>
      }
      alert_logs: {
        Row: AlertLog
        Insert: Omit<AlertLog, 'id' | 'created_at'>
        Update: Partial<Omit<AlertLog, 'id' | 'created_at'>>
      }
      user_subscriptions: {
        Row: UserSubscription
        Insert: Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>>
      }
      subscription_usage: {
        Row: SubscriptionUsage
        Insert: Omit<SubscriptionUsage, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SubscriptionUsage, 'id' | 'created_at' | 'updated_at'>>
      }
      plan_limits: {
        Row: PlanLimits
        Insert: Omit<PlanLimits, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlanLimits, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      monitor_statistics: {
        Row: MonitorStatistics
      }
    }
    Functions: {
      get_response_time_trend: {
        Args: { p_monitor_id: string; p_hours?: number }
        Returns: ResponseTimeTrend[]
      }
      get_uptime_stats: {
        Args: { p_monitor_id: string; p_hours?: number }
        Returns: UptimeStats[]
      }
      get_hourly_monitor_data: {
        Args: { p_monitor_id: string; p_hours?: number }
        Returns: HourlyMonitorData[]
      }
      get_recent_alerts: {
        Args: { p_monitor_id: string; p_hours?: number }
        Returns: RecentAlert[]
      }
      should_send_alert: {
        Args: { p_monitor_id: string; p_notification_channel_id: string; p_cooldown_minutes: number }
        Returns: boolean
      }
      get_user_plan_limits: {
        Args: { p_user_id: string }
        Returns: PlanLimits[]
      }
      can_create_monitor: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      can_use_interval: {
        Args: { p_user_id: string; p_interval_minutes: number }
        Returns: boolean
      }
      can_create_notification_channel: {
        Args: { p_user_id: string; p_type: AlertType }
        Returns: boolean
      }
      can_access_timeframe: {
        Args: { p_user_id: string; p_timeframe: string }
        Returns: boolean
      }
      update_subscription_usage: {
        Args: { 
          p_user_id: string; 
          p_monitor_count?: number; 
          p_notification_channels_count?: number; 
          p_api_calls_increment?: number 
        }
        Returns: void
      }
    }
  }
} 