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

    if (timeFrame === '7d' || timeFrame === '30d') {
      const dailyData = sourceData.reduce((acc, item) => {
        const day = new Date(item.hour_bucket).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { successful_checks: 0, total_checks: 0 };
        }
        acc[day].successful_checks += (item.uptime_percentage / 100) * item.total_checks;
        acc[day].total_checks += item.total_checks;
        return acc;
      }, {} as Record<string, { successful_checks: number; total_checks: number }>);

      return Object.entries(dailyData).map(([day, { successful_checks, total_checks }]) => {
        const date = new Date(day);
        return {
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullTime: date.toISOString(),
          uptime: total_checks > 0 ? (successful_checks / total_checks) * 100 : 0,
          checks: total_checks,
        };
      });
    }

    return sourceData.map(item => {
      const date = new Date(item.hour_bucket);
      return {
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
        fullTime: date.toLocaleString(),
        uptime: item.uptime_percentage,
        checks: item.total_checks,
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

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99.9) return 'text-success'
    if (percentage >= 95) return 'text-warning'
    return 'text-destructive'
  }

  if (transformedData.length === 0 && !detailed) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>
                Uptime history and performance
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
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
                <p className="text-xs text-muted-foreground">
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
            <h3 className="text-lg font-medium text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Uptime data will appear here once monitoring begins
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              Overall uptime: {safeUptimePercentage.toFixed(2)}%
              {trend && (
                <>
                  {trend.change === 0 ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      No trend
                    </span>
                  ) : trend.isImproving ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-success">
                      <TrendingUp className="h-3 w-3" />
                      Trending up by {trend.change.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                      <TrendingDown className="h-3 w-3" />
                      Trending down by {trend.change.toFixed(1)}%
                    </span>
                  )}
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
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
              <p className="text-xs text-muted-foreground">
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
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
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
              type="natural"
              fill="var(--primary)"
              fillOpacity={0.4}
              stroke="var(--primary)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>

        {detailed && transformedData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Best Hour</div>
              <div className="text-lg font-semibold text-success">
                {Math.max(...transformedData.map(d => d.uptime)).toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Average</div>
              <div className="text-lg font-semibold text-primary">
                {safeUptimePercentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Worst Hour</div>
              <div className="text-lg font-semibold text-destructive">
                {Math.min(...transformedData.map(d => d.uptime)).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 