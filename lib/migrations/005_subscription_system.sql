-- Subscription System Database Schema
-- Phase 1: Database Schema Updates for Paid Plan Implementation
-- Run this in your Supabase SQL editor after running the previous migrations

-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan subscription_plan DEFAULT 'free' NOT NULL,
    status subscription_status DEFAULT 'active' NOT NULL,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscription usage tracking table
CREATE TABLE IF NOT EXISTS public.subscription_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE NOT NULL,
    monitor_count INTEGER DEFAULT 0,
    notification_channels_count INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan limits table for configuration
CREATE TABLE IF NOT EXISTS public.plan_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan subscription_plan NOT NULL UNIQUE,
    max_monitors INTEGER NOT NULL,
    allowed_intervals INTEGER[] NOT NULL, -- Array of allowed interval minutes
    allowed_notification_types alert_type[] NOT NULL,
    max_notification_channels INTEGER NOT NULL,
    allowed_chart_timeframes VARCHAR[] NOT NULL, -- ['1h', '6h', '24h', '7d', '30d']
    api_rate_limit INTEGER DEFAULT 1000, -- requests per hour
    priority_support BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON public.user_subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON public.user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON public.subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON public.subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON public.subscription_usage(period_start, period_end);

-- Create updated_at triggers
CREATE TRIGGER set_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscription_usage_updated_at
    BEFORE UPDATE ON public.subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_plan_limits_updated_at
    BEFORE UPDATE ON public.plan_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscription_usage
CREATE POLICY "Users can view their own usage" ON public.subscription_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON public.subscription_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON public.subscription_usage
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for plan_limits (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view plan limits" ON public.plan_limits
    FOR SELECT TO authenticated USING (true);

-- Insert default plan limits
INSERT INTO public.plan_limits (plan, max_monitors, allowed_intervals, allowed_notification_types, max_notification_channels, allowed_chart_timeframes, api_rate_limit, priority_support) VALUES
('free', 3, ARRAY[30, 60], ARRAY['email'::alert_type], 1, ARRAY['1h', '6h'], 100, false),
('pro', 10, ARRAY[1, 5, 10, 15, 30, 60], ARRAY['email'::alert_type, 'sms'::alert_type, 'webhook'::alert_type], -1, ARRAY['1h', '6h', '24h', '7d', '30d'], 10000, true);

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create a free subscription for the new user
    INSERT INTO public.user_subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'free', 'active');
    
    -- Create initial usage tracking
    INSERT INTO public.subscription_usage (user_id, subscription_id, period_start, period_end)
    SELECT 
        NEW.id,
        us.id,
        NOW(),
        NOW() + INTERVAL '1 month'
    FROM public.user_subscriptions us
    WHERE us.user_id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically create subscription for new users
CREATE TRIGGER create_user_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- Function to get user's current plan limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(p_user_id UUID)
RETURNS TABLE (
    plan subscription_plan,
    max_monitors INTEGER,
    allowed_intervals INTEGER[],
    allowed_notification_types alert_type[],
    max_notification_channels INTEGER,
    allowed_chart_timeframes VARCHAR[],
    api_rate_limit INTEGER,
    priority_support BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.plan,
        pl.max_monitors,
        pl.allowed_intervals,
        pl.allowed_notification_types,
        pl.max_notification_channels,
        pl.allowed_chart_timeframes,
        pl.api_rate_limit,
        pl.priority_support
    FROM public.plan_limits pl
    JOIN public.user_subscriptions us ON us.plan = pl.plan
    WHERE us.user_id = p_user_id
        AND us.status = 'active';
END;
$$;

-- Function to check if user can create a new monitor
CREATE OR REPLACE FUNCTION can_create_monitor(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get current monitor count
    SELECT COUNT(*) INTO current_count
    FROM public.monitors
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Get max allowed monitors for user's plan
    SELECT pl.max_monitors INTO max_allowed
    FROM public.plan_limits pl
    JOIN public.user_subscriptions us ON us.plan = pl.plan
    WHERE us.user_id = p_user_id AND us.status = 'active';
    
    -- Return true if unlimited (-1) or under limit
    RETURN (max_allowed = -1 OR current_count < max_allowed);
END;
$$;

-- Function to check if user can use a specific interval
CREATE OR REPLACE FUNCTION can_use_interval(p_user_id UUID, p_interval_minutes INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    allowed_intervals INTEGER[];
BEGIN
    -- Get allowed intervals for user's plan
    SELECT pl.allowed_intervals INTO allowed_intervals
    FROM public.plan_limits pl
    JOIN public.user_subscriptions us ON us.plan = pl.plan
    WHERE us.user_id = p_user_id AND us.status = 'active';
    
    -- Check if the interval is in the allowed list
    RETURN p_interval_minutes = ANY(allowed_intervals);
END;
$$;

-- Function to check if user can create notification channel of specific type
CREATE OR REPLACE FUNCTION can_create_notification_channel(p_user_id UUID, p_type alert_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
    allowed_types alert_type[];
BEGIN
    -- Get current notification channel count
    SELECT COUNT(*) INTO current_count
    FROM public.notification_channels
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Get limits for user's plan
    SELECT pl.max_notification_channels, pl.allowed_notification_types 
    INTO max_allowed, allowed_types
    FROM public.plan_limits pl
    JOIN public.user_subscriptions us ON us.plan = pl.plan
    WHERE us.user_id = p_user_id AND us.status = 'active';
    
    -- Check if type is allowed and under count limit
    RETURN (p_type = ANY(allowed_types)) AND 
           (max_allowed = -1 OR current_count < max_allowed);
END;
$$;

-- Function to check if user can access specific chart timeframe
CREATE OR REPLACE FUNCTION can_access_timeframe(p_user_id UUID, p_timeframe VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    allowed_timeframes VARCHAR[];
BEGIN
    -- Get allowed timeframes for user's plan
    SELECT pl.allowed_chart_timeframes INTO allowed_timeframes
    FROM public.plan_limits pl
    JOIN public.user_subscriptions us ON us.plan = pl.plan
    WHERE us.user_id = p_user_id AND us.status = 'active';
    
    -- Check if the timeframe is in the allowed list
    RETURN p_timeframe = ANY(allowed_timeframes);
END;
$$;

-- Function to update subscription usage
CREATE OR REPLACE FUNCTION update_subscription_usage(
    p_user_id UUID,
    p_monitor_count INTEGER DEFAULT NULL,
    p_notification_channels_count INTEGER DEFAULT NULL,
    p_api_calls_increment INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_usage_id UUID;
BEGIN
    -- Get current usage record
    SELECT id INTO current_usage_id
    FROM public.subscription_usage
    WHERE user_id = p_user_id
        AND period_start <= NOW()
        AND (period_end IS NULL OR period_end > NOW())
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update the usage record
    IF current_usage_id IS NOT NULL THEN
        UPDATE public.subscription_usage
        SET 
            monitor_count = COALESCE(p_monitor_count, monitor_count),
            notification_channels_count = COALESCE(p_notification_channels_count, notification_channels_count),
            api_calls_count = api_calls_count + p_api_calls_increment,
            updated_at = NOW()
        WHERE id = current_usage_id;
    END IF;
END;
$$;

-- Create a function to handle subscription status changes
CREATE OR REPLACE FUNCTION handle_subscription_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to 'canceled'
    IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
        -- Automatically downgrade to free plan
        NEW.plan = 'free';
        NEW.stripe_subscription_id = NULL;
        NEW.stripe_price_id = NULL;
        NEW.current_period_start = NULL;
        NEW.current_period_end = NULL;
        NEW.updated_at = NOW();
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS subscription_status_change_trigger ON user_subscriptions;
CREATE TRIGGER subscription_status_change_trigger
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_subscription_status_change();

-- Function to deactivate monitors over the plan limit when a user's plan changes
CREATE OR REPLACE FUNCTION deactivate_monitors_over_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    max_monitors_for_new_plan INTEGER;
    user_active_monitors_count INTEGER;
    monitors_to_deactivate_count INTEGER;
BEGIN
    -- Check if the plan has actually changed
    IF NEW.plan <> OLD.plan THEN
        -- Get the max_monitors limit for the new plan
        SELECT max_monitors INTO max_monitors_for_new_plan
        FROM public.plan_limits
        WHERE plan = NEW.plan;

        -- Get the count of the user's active monitors
        SELECT COUNT(*) INTO user_active_monitors_count
        FROM public.monitors
        WHERE user_id = NEW.user_id AND is_active = true;

        -- If the new plan has a monitor limit and the user exceeds it
        IF max_monitors_for_new_plan IS NOT NULL AND user_active_monitors_count > max_monitors_for_new_plan THEN
            monitors_to_deactivate_count := user_active_monitors_count - max_monitors_for_new_plan;

            -- Deactivate the newest monitors that are over the limit
            WITH monitors_to_deactivate AS (
                SELECT id
                FROM public.monitors
                WHERE user_id = NEW.user_id AND is_active = true
                ORDER BY created_at DESC
                LIMIT monitors_to_deactivate_count
            )
            UPDATE public.monitors
            SET is_active = false
            WHERE id IN (SELECT id FROM monitors_to_deactivate);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to execute the function after a user's subscription plan changes
CREATE TRIGGER handle_plan_change
    AFTER UPDATE ON public.user_subscriptions
    FOR EACH ROW
    WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
    EXECUTE FUNCTION deactivate_monitors_over_limit();

-- Grant necessary permissions
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.subscription_usage TO authenticated;
GRANT SELECT ON public.plan_limits TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_plan_limits TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_monitor TO authenticated;
GRANT EXECUTE ON FUNCTION can_use_interval TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_notification_channel TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_timeframe TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_usage TO authenticated;