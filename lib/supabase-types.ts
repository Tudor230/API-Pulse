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
  avg_response_time: number | null
  uptime_percentage: number
  total_checks: number
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
    }
  }
} 