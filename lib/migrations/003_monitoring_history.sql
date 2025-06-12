-- Create monitoring_history table for storing historical check results
CREATE TABLE monitoring_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('up', 'down', 'timeout', 'unknown')),
  response_time INTEGER, -- in milliseconds, NULL if request failed
  status_code INTEGER, -- HTTP status code if available
  error_message TEXT, -- error details if check failed
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX idx_monitoring_history_monitor_id ON monitoring_history(monitor_id);
CREATE INDEX idx_monitoring_history_user_id ON monitoring_history(user_id);
CREATE INDEX idx_monitoring_history_checked_at ON monitoring_history(checked_at DESC);
CREATE INDEX idx_monitoring_history_monitor_checked ON monitoring_history(monitor_id, checked_at DESC);
CREATE INDEX idx_monitoring_history_status ON monitoring_history(status);

-- Enable RLS (Row Level Security)
ALTER TABLE monitoring_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring_history
CREATE POLICY "Users can view their own monitoring history" ON monitoring_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitoring history" ON monitoring_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a function to automatically clean up old monitoring history (optional)
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete monitoring history older than 90 days
  DELETE FROM monitoring_history 
  WHERE checked_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a view for monitoring statistics (useful for dashboards)
CREATE OR REPLACE VIEW monitor_statistics AS
SELECT 
  m.id as monitor_id,
  m.user_id,
  m.name,
  m.url,
  m.status as current_status,
  m.last_checked_at,
  -- Uptime calculation (last 24 hours)
  COALESCE(
    (SELECT 
      ROUND(
        (COUNT(*) FILTER (WHERE mh.status = 'up')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
      )
    FROM monitoring_history mh 
    WHERE mh.monitor_id = m.id 
      AND mh.checked_at >= NOW() - INTERVAL '24 hours'
    ), 0
  ) as uptime_24h,
  -- Average response time (last 24 hours, only successful checks)
  COALESCE(
    (SELECT ROUND(AVG(mh.response_time))
    FROM monitoring_history mh 
    WHERE mh.monitor_id = m.id 
      AND mh.status = 'up'
      AND mh.response_time IS NOT NULL
      AND mh.checked_at >= NOW() - INTERVAL '24 hours'
    ), 0
  ) as avg_response_time_24h,
  -- Total checks in last 24 hours
  COALESCE(
    (SELECT COUNT(*)
    FROM monitoring_history mh 
    WHERE mh.monitor_id = m.id 
      AND mh.checked_at >= NOW() - INTERVAL '24 hours'
    ), 0
  ) as total_checks_24h,
  -- Incident count (status changes to down/timeout in last 24 hours)
  COALESCE(
    (SELECT COUNT(*)
    FROM monitoring_history mh 
    WHERE mh.monitor_id = m.id 
      AND mh.status IN ('down', 'timeout')
      AND mh.checked_at >= NOW() - INTERVAL '24 hours'
    ), 0
  ) as incidents_24h
FROM monitors m;

-- Enable RLS on the view
ALTER VIEW monitor_statistics SET (security_invoker = true);

-- Add some useful functions for analytics

-- Function to get response time trend for a monitor
CREATE OR REPLACE FUNCTION get_response_time_trend(
  p_monitor_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  checked_at TIMESTAMP WITH TIME ZONE,
  response_time INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mh.checked_at,
    mh.response_time,
    mh.status
  FROM monitoring_history mh
  WHERE mh.monitor_id = p_monitor_id
    AND mh.checked_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND mh.user_id = auth.uid()
  ORDER BY mh.checked_at ASC;
END;
$$;

-- Function to get uptime statistics for a time period
CREATE OR REPLACE FUNCTION get_uptime_stats(
  p_monitor_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_checks BIGINT,
  successful_checks BIGINT,
  failed_checks BIGINT,
  timeout_checks BIGINT,
  uptime_percentage DECIMAL,
  avg_response_time DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE mh.status = 'up') as successful_checks,
    COUNT(*) FILTER (WHERE mh.status = 'down') as failed_checks,
    COUNT(*) FILTER (WHERE mh.status = 'timeout') as timeout_checks,
    ROUND(
      (COUNT(*) FILTER (WHERE mh.status = 'up')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as uptime_percentage,
    ROUND(AVG(mh.response_time) FILTER (WHERE mh.status = 'up'), 2) as avg_response_time
  FROM monitoring_history mh
  WHERE mh.monitor_id = p_monitor_id
    AND mh.checked_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND mh.user_id = auth.uid();
END;
$$;

-- Function to get hourly aggregated data (useful for charts)
CREATE OR REPLACE FUNCTION get_hourly_monitor_data(
  p_monitor_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  hour_bucket TIMESTAMP WITH TIME ZONE,
  avg_response_time DECIMAL,
  uptime_percentage DECIMAL,
  total_checks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', mh.checked_at) as hour_bucket,
    ROUND(AVG(mh.response_time) FILTER (WHERE mh.status = 'up'), 2) as avg_response_time,
    ROUND(
      (COUNT(*) FILTER (WHERE mh.status = 'up')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as uptime_percentage,
    COUNT(*) as total_checks
  FROM monitoring_history mh
  WHERE mh.monitor_id = p_monitor_id
    AND mh.checked_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND mh.user_id = auth.uid()
  GROUP BY date_trunc('hour', mh.checked_at)
  ORDER BY hour_bucket ASC;
END;
$$; 