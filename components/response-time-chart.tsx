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
  timeFrameOptions
}: ResponseTimeChartProps) {
  // Ensure avgResponseTime is never null
  const safeAvgResponseTime = avgResponseTime ?? 0

  // Transform and sort data for the chart
  const chartData = (() => {
    const sourceData = (data || []).filter(item => item.response_time !== null);
    if (sourceData.length === 0) return [];

    if (timeFrame === '7d' || timeFrame === '30d') {
      const dailyData = sourceData.reduce((acc, item) => {
        const day = new Date(item.checked_at).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { total: 0, count: 0 };
        }
        acc[day].total += item.response_time!;
        acc[day].count++;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      return Object.entries(dailyData).map(([day, { total, count }]) => {
        const date = new Date(day);
        return {
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullTime: date.toISOString(),
          responseTime: total / count,
          status: 'up', // Status is aggregated, so we simplify
        };
      });
    }

    return sourceData.map(item => {
      const date = new Date(item.checked_at);
      return {
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        fullTime: date.toLocaleString(),
        responseTime: item.response_time,
        status: item.status,
      };
    });
  })().sort((a, b) => new Date(a.fullTime).getTime() - new Date(b.fullTime).getTime());

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>
                Response time trends and performance analysis
              </CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Response time data will appear here once monitoring begins
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
              Average response time: {safeAvgResponseTime.toFixed(0)}ms
              {stats && (
                <>
                  {stats.trendChange === 0 ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      No trend
                    </span>
                  ) : stats.isImproving ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-success">
                      <TrendingDown className="h-3 w-3" />
                      Trending down by {stats.trendChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                      <TrendingUp className="h-3 w-3" />
                      Trending up by {stats.trendChange.toFixed(1)}%
                    </span>
                  )}
                </>
              )}
            </CardDescription>
          </div>
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
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}ms`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
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
              type="natural"
              fill="var(--primary)"
              fillOpacity={0.4}
              stroke="var(--primary)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        
        {detailed && stats && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Minimum</div>
              <div className="text-lg font-semibold text-success">{stats.min}ms</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Average</div>
              <div className="text-lg font-semibold text-primary">{safeAvgResponseTime.toFixed(0)}ms</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Maximum</div>
              <div className="text-lg font-semibold text-destructive">{stats.max}ms</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 