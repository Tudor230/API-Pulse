'use client'

import { useState, useEffect, useCallback } from "react";
import { ResponseTimeTrend, UptimeStats, HourlyMonitorData } from '@/lib/supabase-types'
import { useSubscription } from '@/lib/hooks/use-subscription'
import ResponseTimeChart from "./response-time-chart";
import UptimeChart from "./uptime-chart";
import { Skeleton } from "./ui/skeleton";

interface MonitorChartWrapperProps {
    monitorId: string;
    initialData: {
        responseTrend: ResponseTimeTrend[];
        hourlyData: HourlyMonitorData[];
        stats: UptimeStats;
    };
    title: string;
    chartType: 'response-time' | 'uptime';
    detailed?: boolean;
}

const allTimeFrameOptions = [
    { value: '1h', label: 'Last Hour', hours: 1 },
    { value: '6h', label: 'Last 6 Hours', hours: 6 },
    { value: '24h', label: 'Last 24 Hours', hours: 24 },
    { value: '7d', label: 'Last 7 Days', hours: 168 },
    { value: '30d', label: 'Last 30 Days', hours: 720 },
]

export default function MonitorChartWrapper({
    monitorId,
    initialData,
    title,
    chartType,
    detailed = false
}: MonitorChartWrapperProps) {
    const { getAllowedTimeframes, isFreePlan, loading } = useSubscription()
    const allowedTimeframes = getAllowedTimeframes()
    console.log('Allowed timeframes:', allowedTimeframes);
    
    // Calculate initial timeframe based on user's plan
    const getInitialTimeframe = () => {
        // If subscription is still loading, default to 24h (will be corrected when loaded)
        if (loading) {
            return '24h';
        }
        
        if (allowedTimeframes.includes('24h')) {
            return '24h'; // Pro users get 24h
        }
        return allowedTimeframes[allowedTimeframes.length - 1] || '6h'; // Free users get last allowed timeframe
    }

    const [timeFrame, setTimeFrame] = useState(getInitialTimeframe);
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    console.log('Initial timeframe:', timeFrame);
    
    // Filter timeframe options based on user's plan
    const timeFrameOptions = allTimeFrameOptions.filter(option =>
        allowedTimeframes.includes(option.value)
    )

    const handleTimeFrameChange = useCallback(async (newTimeFrame: string) => {
        const selectedOption = timeFrameOptions.find(opt => opt.value === newTimeFrame);
        if (!selectedOption) return;

        setTimeFrame(newTimeFrame);

        if (newTimeFrame === '24h') {
            setData(initialData);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/monitors/${monitorId}/stats?hours=${selectedOption.hours}`);
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    if (errorData.code === 'TIMEFRAME_NOT_ALLOWED') {
                        console.error('Timeframe not allowed for current plan:', errorData.error);
                        // Keep current data, don't throw error to prevent UI breaks
                        return;
                    }
                }
                throw new Error('Failed to fetch data');
            }
            const newData = await response.json();
            setData({
                responseTrend: newData.response_trend,
                hourlyData: newData.hourly_data,
                stats: newData.uptime_stats,
            });
        } catch (error) {
            console.error(error);
            // Optionally, set an error state to show in the UI
        } finally {
            setIsLoading(false);
        }
    }, [monitorId, initialData, timeFrameOptions]);

    // Handle subscription loading completion and correct timeframe if needed
    useEffect(() => {
        if (!loading && allowedTimeframes.length > 0) {
            const correctTimeframe = allowedTimeframes.includes('24h') ? '24h' : (allowedTimeframes[allowedTimeframes.length - 1] || '6h');
            
            // If the current timeframe is different from what it should be, update it
            if (timeFrame !== correctTimeframe) {
                setTimeFrame(correctTimeframe);
                
                // If switching away from 24h, fetch appropriate data
                if (correctTimeframe !== '24h') {
                    handleTimeFrameChange(correctTimeframe);
                }
            }
        }
    }, [loading, allowedTimeframes, timeFrame, handleTimeFrameChange]);

    // Initialize data for the correct timeframe (only run once on mount)
    useEffect(() => {
        if (!hasInitialized && !loading && allowedTimeframes.length > 0) {
            setHasInitialized(true);

            // If user can't access 24h data and we're not showing 24h, fetch correct data
            if (!allowedTimeframes.includes('24h') && timeFrame !== '24h') {
                handleTimeFrameChange(timeFrame);
            }
        }
    }, [allowedTimeframes, timeFrame, hasInitialized, loading, handleTimeFrameChange]);

    if (isLoading) {
        return <Skeleton className="h-[420px] w-full" />;
    }

    if (chartType === 'response-time') {
        return (
            <ResponseTimeChart
                data={data.responseTrend}
                title={title}
                avgResponseTime={data.stats?.avg_response_time ?? 0}
                detailed={detailed}
                timeFrame={timeFrame}
                onTimeFrameChangeAction={handleTimeFrameChange}
                timeFrameOptions={timeFrameOptions}
                isFreePlan={isFreePlan}
            />
        );
    }

    if (chartType === 'uptime') {
        return (
            <UptimeChart
                data={data.hourlyData}
                title={title}
                uptimePercentage={data.stats?.uptime_percentage ?? 0}
                detailed={detailed}
                timeFrame={timeFrame}
                onTimeFrameChangeAction={handleTimeFrameChange}
                timeFrameOptions={timeFrameOptions}
                isFreePlan={isFreePlan}
            />
        );
    }

    return null;
} 