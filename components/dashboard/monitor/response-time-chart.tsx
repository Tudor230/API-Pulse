"use client"

import { ResponseTimeTrend } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, ArrowRight, Activity } from 'lucide-react'
import { useState } from 'react'

interface TimeFrameOption {
  value: string;
  label: string;
  hours: number;
}

interface ResponseTimeChartProps {
  data: ResponseTimeTrend[]
  title: string
  avgResponseTime: number
  detailed?: boolean
  timeFrame: string
  onTimeFrameChangeAction: (value: string) => void
  timeFrameOptions: TimeFrameOption[]
  isFreePlan?: boolean
}

const chartConfig = {
  responseTime: {
    label: "Response Time (ms)",
    color: "hsl(var(--chart-1))",
  },
}

export default function ResponseTimeChart({
  data,
  title,
  avgResponseTime,
  detailed = false,
  timeFrame,
  onTimeFrameChangeAction,
  timeFrameOptions,
  isFreePlan = false
}: ResponseTimeChartProps) {
  // Ensure avgResponseTime is never null
  const safeAvgResponseTime = avgResponseTime ?? 0

  // Transform and sort data for the chart
  const chartData = (() => {
    const sourceData = (data || []).filter(item => item.response_time !== null);
    if (sourceData.length === 0) return [];

    // Sort data chronologically first
    const sortedData = sourceData.sort((a, b) =>
      new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
    );

    // Aggregate data based on timeframe and data density
    const aggregateData = (data: typeof sortedData, bucketSize: number) => {
      if (data.length <= bucketSize) return data;

      const buckets: typeof sortedData[] = [];
      const bucketCount = Math.ceil(data.length / bucketSize);
      const itemsPerBucket = Math.ceil(data.length / bucketCount);

      for (let i = 0; i < data.length; i += itemsPerBucket) {
        buckets.push(data.slice(i, i + itemsPerBucket));
      }

      return buckets.map(bucket => {
        const responseTimes = bucket.map(item => item.response_time!);
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);

        // Use the middle timestamp of the bucket for better representation
        const middleIndex = Math.floor(bucket.length / 2);
        const representativeItem = bucket[middleIndex];

        return {
          ...representativeItem,
          response_time: avgResponseTime,
          max_response_time: maxResponseTime,
          bucket_size: bucket.length
        };
      });
    };

    // Determine optimal number of data points based on timeframe
    let maxDataPoints: number;
    let aggregatedData: typeof sortedData;

    if (timeFrame === '1h') {
      maxDataPoints = 60; // Show every minute or aggregate to ~60 points
      aggregatedData = aggregateData(sortedData, 1); // Minimal aggregation for 1h
    } else if (timeFrame === '6h') {
      // maxDataPoints = 72; // ~6 points per hour
      // aggregatedData = aggregateData(sortedData, Math.max(1, Math.floor(sortedData.length / maxDataPoints)));
      aggregatedData = aggregateData(sortedData, 72);
    } else if (timeFrame === '24h') {
      // maxDataPoints = 96; // ~4 points per hour
      // aggregatedData = aggregateData(sortedData, Math.max(1, Math.floor(sortedData.length / maxDataPoints)));
      aggregatedData = aggregateData(sortedData, 96);
    } else if (timeFrame === '7d') {
      // Daily aggregation for 7 days
      const dailyData = sortedData.reduce((acc, item) => {
        const day = new Date(item.checked_at).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(item);
        return acc;
      }, {} as Record<string, typeof sortedData>);

      aggregatedData = Object.entries(dailyData).map(([day, dayData]) => {
        const responseTimes = dayData.map(item => item.response_time!);
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);

        return {
          checked_at: day + 'T12:00:00Z', // Use noon as representative time
          response_time: avgResponseTime,
          max_response_time: maxResponseTime,
          bucket_size: dayData.length
        };
      });
    } else if (timeFrame === '30d') {
      // Daily aggregation for 30 days
      const dailyData = sortedData.reduce((acc, item) => {
        const day = new Date(item.checked_at).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(item);
        return acc;
      }, {} as Record<string, typeof sortedData>);

      aggregatedData = Object.entries(dailyData).map(([day, dayData]) => {
        const responseTimes = dayData.map(item => item.response_time!);
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);

        return {
          checked_at: day + 'T12:00:00Z',
          response_time: avgResponseTime,
          max_response_time: maxResponseTime,
          bucket_size: dayData.length
        };
      });
    } else {
      // Default aggregation
      maxDataPoints = 100;
      aggregatedData = aggregateData(sortedData, Math.max(1, Math.floor(sortedData.length / maxDataPoints)));
    }

    // Transform aggregated data for chart display
    return aggregatedData.map(item => {
      const date = new Date(item.checked_at);
      let timeFormat: string;
      let mobileTimeFormat: string;

      if (timeFrame === '30d') {
        timeFormat = date.getDate().toString(); // Only day number for 30d
        mobileTimeFormat = date.getDate().toString();
      } else if (timeFrame === '7d') {
        timeFormat = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        mobileTimeFormat = date.getDate().toString(); // Just day number on mobile
      } else {
        // For hour-based timeframes (1h, 6h, 24h)
        timeFormat = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        mobileTimeFormat = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }); // 12-hour format for mobile
      }

      return {
        time: timeFormat,
        mobileTime: mobileTimeFormat,
        fullTime: date.toLocaleString(),
        responseTime: item.response_time,
        maxResponseTime: (item as any).max_response_time || item.response_time,
        // status: item.status,
        bucketSize: (item as any).bucket_size || 1,
      };
    });
  })();

  // Calculate statistics
  const getStats = () => {
    if (chartData.length === 0) return null

    const responseTimes = chartData.map(d => d.responseTime || 0)
    const min = Math.min(...responseTimes)
    const max = Math.max(...responseTimes)

    // Calculate trend
    const firstHalf = chartData.slice(0, Math.ceil(chartData.length / 2))
    const secondHalf = chartData.slice(Math.ceil(chartData.length / 2))

    const firstAvg = firstHalf.reduce((sum, item) => sum + (item.responseTime || 0), 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, item) => sum + (item.responseTime || 0), 0) / secondHalf.length

    const trendChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0

    return {
      min,
      max,
      isImproving: trendChange < 0,
      trendChange: Math.abs(trendChange)
    }
  }

  const stats = getStats()

  if (chartData.length === 0 && !detailed) {
    return (
      <Card className="bg-background/60 backdrop-blur-md shadow-lg">
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                {title}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Response time trends and performance analysis
              </CardDescription>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <Select value={timeFrame} onValueChange={onTimeFrameChangeAction}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFrameOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFreePlan && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Upgrade for longer time ranges
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm sm:text-lg font-medium text-foreground mb-2">No Data Available</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Response time data will appear here once monitoring begins
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-background/60 backdrop-blur-md shadow-lg">
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Average response time: {safeAvgResponseTime.toFixed(0)}ms
              {stats && (
                <>
                  {stats.trendChange === 0 || isNaN(stats.trendChange) ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground text-xs sm:text-sm">
                      <ArrowRight className="h-2 w-2 sm:h-3 sm:w-3" />
                      No trend
                    </span>
                  ) : stats.isImproving ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-success text-xs sm:text-sm">
                      <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3" />
                      Trending down by {stats.trendChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1 text-destructive text-xs sm:text-sm">
                      <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3" />
                      Trending up by {stats.trendChange.toFixed(1)}%
                    </span>
                  )}
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <Select value={timeFrame} onValueChange={onTimeFrameChangeAction}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeFrameOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFreePlan && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                Upgrade for longer time ranges
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value, index) => {
                // Use mobile format on smaller screens and fewer ticks
                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                  const item = chartData[index];
                  return item?.mobileTime || value;
                }
                return value;
              }}
              interval={
                typeof window !== 'undefined' && window.innerWidth < 640
                  ? Math.max(0, Math.floor(chartData.length / 6)) // Show ~6 labels on mobile
                  : chartData.length > 50
                    ? Math.floor(chartData.length / 4)
                    : chartData.length > 20
                      ? Math.floor(chartData.length / 6)
                      : chartData.length > 10
                        ? 1
                        : 0
              }
              className="text-xs sm:text-sm"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}ms`}
              className="text-xs sm:text-sm"
              width={45}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;

                const data = payload[0].payload;
                const bucketSize = data.bucketSize || 1;
                const maxResponseTime = data.maxResponseTime;

                return (
                  <div className="rounded-lg border bg-background/60 backdrop-blur-xl p-3 shadow-lg">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{data.fullTime}</span>
                      </div>
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm">Avg Response Time:</span>
                          <span className="font-mono text-xs sm:text-sm font-medium">
                            {Math.round(data.responseTime)}ms
                          </span>
                        </div>
                        {bucketSize > 1 && maxResponseTime && (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm">Max Response Time:</span>
                              <span className="font-mono text-xs sm:text-sm font-medium">
                                {Math.round(maxResponseTime)}ms
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm text-muted-foreground">Data Points:</span>
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                {bucketSize} checks
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Reference lines */}
            <ReferenceLine
              y={safeAvgResponseTime}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <ReferenceLine
              y={500}
              stroke="hsl(var(--success))"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={1000}
              stroke="hsl(var(--warning))"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />

            <Area
              dataKey="responseTime"
              type="monotone"
              fill="var(--primary)"
              fillOpacity={0.3}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{
                fill: "var(--primary)",
                strokeWidth: 0,
                r: chartData.length > 50 ? 0 : 2,
              }}
              activeDot={{
                r: 4,
                fill: "var(--primary)",
                strokeWidth: 2,
                stroke: "var(--background)",
              }}
            />
          </AreaChart>
        </ChartContainer>

        {detailed && stats && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Minimum</div>
              <div className="text-sm sm:text-lg font-semibold text-success">{stats.min.toFixed(0)}ms</div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Average</div>
              <div className="text-sm sm:text-lg font-semibold text-primary">{safeAvgResponseTime.toFixed(0)}ms</div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Maximum</div>
              <div className="text-sm sm:text-lg font-semibold text-destructive">{stats.max.toFixed(0)}ms</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 