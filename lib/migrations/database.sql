-- API-Pulse Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create monitor status enum
CREATE TYPE public.monitor_status AS ENUM ('up', 'down', 'pending', 'timeout', 'unknown');


-- Create monitors table
CREATE TABLE IF NOT EXISTS public.monitors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    status monitor_status DEFAULT 'pending',
    interval_minutes INTEGER DEFAULT 5 CHECK (interval_minutes > 0),
    is_active BOOLEAN DEFAULT true,
    response_time INTEGER, -- Response time in milliseconds
    last_checked_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON public.monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_next_check_at ON public.monitors(next_check_at);
CREATE INDEX IF NOT EXISTS idx_monitors_is_active ON public.monitors(is_active);
CREATE INDEX IF NOT EXISTS idx_monitors_status ON public.monitors(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.monitors
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own monitors
CREATE POLICY "Users can view their own monitors"
    ON public.monitors
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own monitors
CREATE POLICY "Users can insert their own monitors"
    ON public.monitors
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own monitors
CREATE POLICY "Users can update their own monitors"
    ON public.monitors
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own monitors
CREATE POLICY "Users can delete their own monitors"
    ON public.monitors
    FOR DELETE
    USING (auth.uid() = user_id);

-- Optional: Create a view for monitor statistics
CREATE OR REPLACE VIEW public.monitor_stats AS
SELECT 
    user_id,
    COUNT(*) as total_monitors,
    COUNT(*) FILTER (WHERE status = 'up') as up_monitors,
    COUNT(*) FILTER (WHERE status = 'down') as down_monitors,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_monitors,
    COUNT(*) FILTER (WHERE is_active = true) as active_monitors,
    -- Calculate average response time only from successful 'up' status monitors
    AVG(response_time) FILTER (WHERE status = 'up' AND response_time IS NOT NULL) as avg_response_time
FROM public.monitors
GROUP BY user_id;

-- Sample data (optional - remove in production)
-- INSERT INTO public.monitors (user_id, name, url, interval_minutes) VALUES
-- (auth.uid(), 'Google', 'https://www.google.com', 5),
-- (auth.uid(), 'GitHub API', 'https://api.github.com', 10);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.monitors TO authenticated;
GRANT SELECT ON public.monitor_stats TO authenticated; 