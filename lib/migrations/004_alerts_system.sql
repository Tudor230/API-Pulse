-- Alert System Database Schema
-- Run this in your Supabase SQL editor after running the base migrations

-- Create alert types enum
CREATE TYPE public.alert_type AS ENUM ('email', 'sms', 'webhook');

-- Create alert status enum  
CREATE TYPE public.alert_status AS ENUM ('pending', 'sent', 'failed', 'queued');

-- Create notification channels table
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type alert_type NOT NULL,
    config JSONB NOT NULL, -- Store email, phone, webhook URL, etc.
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitor alert rules table
CREATE TABLE IF NOT EXISTS public.monitor_alert_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
    notification_channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    alert_on_down BOOLEAN DEFAULT true,
    alert_on_up BOOLEAN DEFAULT false, -- Recovery alerts
    alert_on_timeout BOOLEAN DEFAULT true,
    consecutive_failures_threshold INTEGER DEFAULT 1 CHECK (consecutive_failures_threshold > 0),
    cooldown_minutes INTEGER DEFAULT 60 CHECK (cooldown_minutes >= 0), -- Prevent spam
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(monitor_id, notification_channel_id)
);

-- Create alert logs table
CREATE TABLE IF NOT EXISTS public.alert_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
    monitor_alert_rule_id UUID REFERENCES monitor_alert_rules(id) ON DELETE SET NULL,
    notification_channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    alert_type alert_type NOT NULL,
    status alert_status DEFAULT 'pending',
    trigger_status monitor_status NOT NULL, -- What status triggered the alert
    previous_status monitor_status, -- Previous status before the trigger
    consecutive_failures INTEGER DEFAULT 1,
    message TEXT NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON public.notification_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON public.notification_channels(type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_active ON public.notification_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_monitor_alert_rules_monitor_id ON public.monitor_alert_rules(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_alert_rules_user_id ON public.monitor_alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_monitor_alert_rules_active ON public.monitor_alert_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_alert_logs_monitor_id ON public.alert_logs(monitor_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id ON public.alert_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_status ON public.alert_logs(status);
CREATE INDEX IF NOT EXISTS idx_alert_logs_created_at ON public.alert_logs(created_at DESC);

-- Create updated_at triggers
CREATE TRIGGER set_notification_channels_updated_at
    BEFORE UPDATE ON public.notification_channels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_monitor_alert_rules_updated_at
    BEFORE UPDATE ON public.monitor_alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_channels
CREATE POLICY "Users can view their own notification channels" ON public.notification_channels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification channels" ON public.notification_channels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification channels" ON public.notification_channels
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification channels" ON public.notification_channels
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for monitor_alert_rules  
CREATE POLICY "Users can view their own alert rules" ON public.monitor_alert_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert rules" ON public.monitor_alert_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert rules" ON public.monitor_alert_rules
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert rules" ON public.monitor_alert_rules
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for alert_logs
CREATE POLICY "Users can view their own alert logs" ON public.alert_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert logs" ON public.alert_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a function to get recent alerts for a monitor
CREATE OR REPLACE FUNCTION get_recent_alerts(
    p_monitor_id UUID,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    id UUID,
    alert_type alert_type,
    status alert_status,
    trigger_status monitor_status,
    message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.alert_type,
        al.status,
        al.trigger_status,
        al.message,
        al.sent_at,
        al.created_at
    FROM alert_logs al
    WHERE al.monitor_id = p_monitor_id
        AND al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
        AND al.user_id = auth.uid()
    ORDER BY al.created_at DESC;
END;
$$;

-- Create a function to check if we should send an alert (cooldown logic)
CREATE OR REPLACE FUNCTION should_send_alert(
    p_monitor_id UUID,
    p_notification_channel_id UUID,
    p_cooldown_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_alert_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last alert time for this monitor and channel
    SELECT MAX(created_at) INTO last_alert_time
    FROM alert_logs
    WHERE monitor_id = p_monitor_id
        AND notification_channel_id = p_notification_channel_id
        AND status = 'sent';
    
    -- If no previous alert or cooldown period has passed, allow sending
    RETURN (last_alert_time IS NULL OR 
            last_alert_time <= NOW() - (p_cooldown_minutes || ' minutes')::INTERVAL);
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.notification_channels TO authenticated;
GRANT ALL ON public.monitor_alert_rules TO authenticated;
GRANT ALL ON public.alert_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_alert TO authenticated; 