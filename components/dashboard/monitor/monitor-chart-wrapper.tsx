'use client'

import { useState, useEffect, useCallback } from "react";
import { ResponseTimeTrend, UptimeStats, HourlyMonitorData } from '@/lib/supabase-types'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import ResponseTimeChart from "./response-time-chart";
import UptimeChart from "./uptime-chart";
import { Skeleton } from "../../ui/skeleton";

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

    const [timeFrame, setTimeFrame] = useState('24h'); // Start with 24h, will be corrected
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);

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

    // Handle subscription loading completion and set correct initial timeframe
    useEffect(() => {
        if (!loading && allowedTimeframes.length > 0 && !hasInitialized) {
            setHasInitialized(true);

            const correctTimeframe = allowedTimeframes.includes('24h') ? '24h' : (allowedTimeframes[allowedTimeframes.length - 1] || '6h');

            setTimeFrame(correctTimeframe);

            // If user can't access 24h data, fetch correct data
            if (correctTimeframe !== '24h') {
                handleTimeFrameChange(correctTimeframe);
            }
        }
    }, [loading, allowedTimeframes, hasInitialized, handleTimeFrameChange]);

    // Remove the old initialization useEffect since it's now handled above

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