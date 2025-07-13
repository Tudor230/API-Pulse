"use client"

import { HourlyMonitorData } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { Activity, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useState } from 'react'

interface TimeFrameOption {
  value: string;
  label: string;
  hours: number;
}

interface UptimeChartProps {
  data: HourlyMonitorData[]
  title: string
  uptimePercentage: number
  detailed?: boolean
  timeFrame: string
  onTimeFrameChangeAction: (value: string) => void
  timeFrameOptions: TimeFrameOption[]
  isFreePlan?: boolean
}

const chartConfig = {
  uptime: {
    label: "Uptime (%)",
    color: "hsl(var(--chart-2))",
  },
}

export default function UptimeChart({
  data,
  title,
  uptimePercentage,
  detailed = false,
  timeFrame,
  onTimeFrameChangeAction,
  timeFrameOptions,
  isFreePlan = false
}: UptimeChartProps) {

  const transformedData = (() => {
    const sourceData = data || [];
    if (sourceData.length === 0) return [];

    // Sort data chronologically
    const sortedData = sourceData.sort((a, b) =>
      new Date(a.hour_bucket).getTime() - new Date(b.hour_bucket).getTime()
    );

    // Aggregate data based on timeframe and data density
    const aggregateData = (data: typeof sortedData, maxPoints: number) => {
      if (data.length <= maxPoints) return data;

      const bucketCount = maxPoints;
      const itemsPerBucket = Math.ceil(data.length / bucketCount);
      const buckets: typeof sortedData[] = [];

      for (let i = 0; i < data.length; i += itemsPerBucket) {
        buckets.push(data.slice(i, i + itemsPerBucket));
      }

      return buckets.map(bucket => {
        const totalSuccessfulChecks = bucket.reduce((sum, item) =>
          sum + (item.uptime_percentage / 100) * item.total_checks, 0);
        const totalChecks = bucket.reduce((sum, item) => sum + item.total_checks, 0);
        const avgUptime = totalChecks > 0 ? (totalSuccessfulChecks / totalChecks) * 100 : 0;

        // Calculate failed checks more accurately
        const successfulChecks = Math.round(totalSuccessfulChecks);
        const failedChecks = totalChecks - successfulChecks;

        // Calculate average response time
        const avgResponseTime = bucket.reduce((sum, item) => sum + item.avg_response_time, 0) / bucket.length;

        // Use the middle timestamp of the bucket
        const middleIndex = Math.floor(bucket.length / 2);
        const representativeItem = bucket[middleIndex];

        return {
          hour_bucket: representativeItem.hour_bucket,
          uptime_percentage: avgUptime,
          total_checks: totalChecks,
          failed_checks: Math.max(0, failedChecks), // Ensure non-negative
          avg_response_time: avgResponseTime,
          bucket_size: bucket.length
        };
      });
    };

    let aggregatedData: (typeof sortedData[0] & { bucket_size?: number })[];

    // Determine optimal number of data points based on timeframe
    if (timeFrame === '1h') {
      aggregatedData = aggregateData(sortedData, 60); // ~1 point per minute
    } else if (timeFrame === '6h') {
      aggregatedData = aggregateData(sortedData, 72); // ~12 points per hour
    } else if (timeFrame === '24h') {
      aggregatedData = aggregateData(sortedData, 96); // ~4 points per hour
    } else if (timeFrame === '7d') {
      // Daily aggregation for 7 days
      const dailyData = sortedData.reduce((acc, item) => {
        const day = new Date(item.hour_bucket).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(item);
        return acc;
      }, {} as Record<string, typeof sortedData>);

      aggregatedData = Object.entries(dailyData).map(([day, dayData]) => {
        const totalSuccessfulChecks = dayData.reduce((sum, item) =>
          sum + (item.uptime_percentage / 100) * item.total_checks, 0);
        const totalChecks = dayData.reduce((sum, item) => sum + item.total_checks, 0);
        const avgUptime = totalChecks > 0 ? (totalSuccessfulChecks / totalChecks) * 100 : 0;
        const avgResponseTime = dayData.reduce((sum, item) => sum + item.avg_response_time, 0) / dayData.length;

        // Calculate failed checks more accurately
        const successfulChecks = Math.round(totalSuccessfulChecks);
        const failedChecks = totalChecks - successfulChecks;

        return {
          hour_bucket: day + 'T12:00:00Z', // Use noon as representative time
          uptime_percentage: avgUptime,
          total_checks: totalChecks,
          failed_checks: Math.max(0, failedChecks), // Ensure non-negative
          avg_response_time: avgResponseTime,
          bucket_size: dayData.length
        };
      });
    } else if (timeFrame === '30d') {
      // Daily aggregation for 30 days
      const dailyData = sortedData.reduce((acc, item) => {
        const day = new Date(item.hour_bucket).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(item);
        return acc;
      }, {} as Record<string, typeof sortedData>);

      aggregatedData = Object.entries(dailyData).map(([day, dayData]) => {
        const totalSuccessfulChecks = dayData.reduce((sum, item) =>
          sum + (item.uptime_percentage / 100) * item.total_checks, 0);
        const totalChecks = dayData.reduce((sum, item) => sum + item.total_checks, 0);
        const avgUptime = totalChecks > 0 ? (totalSuccessfulChecks / totalChecks) * 100 : 0;
        const avgResponseTime = dayData.reduce((sum, item) => sum + item.avg_response_time, 0) / dayData.length;

        // Calculate failed checks more accurately
        const successfulChecks = Math.round(totalSuccessfulChecks);
        const failedChecks = totalChecks - successfulChecks;

        return {
          hour_bucket: day + 'T12:00:00Z',
          uptime_percentage: avgUptime,
          total_checks: totalChecks,
          failed_checks: Math.max(0, failedChecks), // Ensure non-negative
          avg_response_time: avgResponseTime,
          bucket_size: dayData.length,
        };
      });
    } else {
      aggregatedData = aggregateData(sortedData, 100); // Default max points
    }

    // Transform aggregated data for chart display
    return aggregatedData.map(item => {
      const date = new Date(item.hour_bucket);
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
        mobileTimeFormat = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }); // Shorter format for mobile
      }

      return {
        time: timeFormat,
        mobileTime: mobileTimeFormat,
        fullTime: date.toLocaleString(),
        uptime: item.uptime_percentage,
        checks: item.total_checks,
        failed_checks: item.failed_checks || Math.max(0, Math.round(item.total_checks * (100 - item.uptime_percentage) / 100)),
        bucketSize: item.bucket_size || 1,
      };
    });
  })().sort((a, b) => new Date(a.fullTime).getTime() - new Date(b.fullTime).getTime());

  const safeUptimePercentage = uptimePercentage ?? 0

  // Calculate trend
  const getTrend = () => {
    if (transformedData.length < 2) return null

    const firstHalf = transformedData.slice(0, Math.ceil(transformedData.length / 2))
    const secondHalf = transformedData.slice(Math.ceil(transformedData.length / 2))

    const firstAvg = firstHalf.reduce((sum, item) => sum + item.uptime, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.uptime, 0) / secondHalf.length

    const change = secondAvg - firstAvg

    return {
      isImproving: change > 0,
      change: Math.abs(change)
    }
  }

  const trend = getTrend()

  if (transformedData.length === 0 && !detailed) {
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
                Uptime history and performance
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
              Uptime data will appear here once monitoring begins
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
              Overall uptime: {safeUptimePercentage.toFixed(2)}%
              {trend && (
                <>
                  {trend.change === 0 ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground text-xs sm:text-sm">
                      <ArrowRight className="h-2 w-2 sm:h-3 sm:w-3" />
                      No trend
                    </span>
                  ) : trend.isImproving ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-success text-xs sm:text-sm">
                      <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3" />
                      Trending up by {trend.change.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1 text-destructive text-xs sm:text-sm">
                      <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3" />
                      Trending down by {trend.change.toFixed(1)}%
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
            data={transformedData}
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
                  const item = transformedData[index];
                  return item?.mobileTime || value;
                }
                return value;
              }}
              interval={transformedData.length > 50 ? Math.floor(transformedData.length / 4) : transformedData.length > 20 ? Math.floor(transformedData.length / 6) : transformedData.length > 10 ? 1 : 0}
              className="text-xs sm:text-sm"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              className="text-xs sm:text-sm"
              width={35}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;

                const data = payload[0].payload;
                const bucketSize = data.bucketSize || 1;

                return (
                  <div className="rounded-lg border bg-background/60 backdrop-blur-xl p-3 shadow-lg">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{data.fullTime}</span>
                      </div>
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm">Uptime:</span>
                          <span className="font-mono text-xs sm:text-sm font-medium">
                            {data.uptime.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm">Total Checks:</span>
                          <span className="font-mono text-xs sm:text-sm font-medium">
                            {data.checks}
                          </span>
                        </div>
                        {data.failed_checks > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm text-destructive">Failed:</span>
                            <span className="font-mono text-xs sm:text-sm font-medium text-destructive">
                              {data.failed_checks} timeout/down
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Reference lines */}
            <ReferenceLine
              y={99.9}
              stroke="hsl(var(--success))"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <ReferenceLine
              y={95}
              stroke="hsl(var(--warning))"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />

            <Area
              dataKey="uptime"
              type="monotone"
              fill="var(--primary)"
              fillOpacity={0.3}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{
                fill: "var(--primary)",
                strokeWidth: 0,
                r: transformedData.length > 50 ? 0 : 2,
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

        {detailed && transformedData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Best Hour</div>
              <div className="text-sm sm:text-lg font-semibold text-success">
                {Math.max(...transformedData.map(d => d.uptime)).toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Average</div>
              <div className="text-sm sm:text-lg font-semibold text-primary">
                {safeUptimePercentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Worst Hour</div>
              <div className="text-sm sm:text-lg font-semibold text-destructive">
                {Math.min(...transformedData.map(d => d.uptime)).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 