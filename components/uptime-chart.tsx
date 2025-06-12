"use client"

import { HourlyMonitorData } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'

interface UptimeChartProps {
  data: HourlyMonitorData[]
  title: string
  uptimePercentage: number
  detailed?: boolean
}

type TimeFrame = '1h' | '6h' | '24h' | '7d' | '30d'

const timeFrameOptions = [
  { value: '1h', label: 'Last Hour', hours: 1 },
  { value: '6h', label: 'Last 6 Hours', hours: 6 },
  { value: '24h', label: 'Last 24 Hours', hours: 24 },
  { value: '7d', label: 'Last 7 Days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 Days', hours: 24 * 30 },
]

const chartConfig = {
  uptime: {
    label: "Uptime (%)",
    color: "hsl(var(--chart-2))",
  },
}

export default function UptimeChart({ data, title, uptimePercentage, detailed = false }: UptimeChartProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('24h')

  // Filter data based on selected time frame
  const getFilteredData = () => {
    const selectedOption = timeFrameOptions.find(opt => opt.value === selectedTimeFrame)
    if (!selectedOption) return data

    const hoursAgo = selectedOption.hours
    const cutoffTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000))
    
    return data.filter(item => new Date(item.hour_bucket) >= cutoffTime)
  }

  const filteredData = getFilteredData()

  // Transform data for the chart - ensure we have valid data
  const chartData = (filteredData || [])
    .filter(item => item && item.hour_bucket) // Filter out null/undefined items
    .map(item => {
      const date = new Date(item.hour_bucket)
      return {
        hour: selectedTimeFrame === '7d' || selectedTimeFrame === '30d' 
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
        fullTime: date.toLocaleString(),
        uptime: Math.min(100, Math.max(0, Math.round((item.uptime_percentage || 0) * 10) / 10)), // Ensure 0-100 range
        responseTime: item.avg_response_time,
        checks: item.total_checks || 0
      }
    })
    .sort((a, b) => new Date(a.fullTime).getTime() - new Date(b.fullTime).getTime()) // Sort oldest to newest

  // Calculate trend
  const getTrend = () => {
    if (chartData.length < 2) return null
    
    const firstHalf = chartData.slice(0, Math.ceil(chartData.length / 2))
    const secondHalf = chartData.slice(Math.ceil(chartData.length / 2))
    
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

  if (chartData.length === 0) {
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
                Uptime tracking and availability analysis
              </CardDescription>
            </div>
            <Select value={selectedTimeFrame} onValueChange={(value: TimeFrame) => setSelectedTimeFrame(value)}>
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
              Overall uptime: <span className={getUptimeColor(uptimePercentage)}>
                {uptimePercentage.toFixed(2)}%
              </span>
              {trend && (
                <>
                  {trend.isImproving ? (
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
          <Select value={selectedTimeFrame} onValueChange={(value: TimeFrame) => setSelectedTimeFrame(value)}>
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
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 105]}
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
        
        {detailed && chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Best Hour</div>
              <div className="text-lg font-semibold text-success">
                {Math.max(...chartData.map(d => d.uptime)).toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Average</div>
              <div className="text-lg font-semibold text-primary">
                {uptimePercentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Worst Hour</div>
              <div className="text-lg font-semibold text-destructive">
                {Math.min(...chartData.map(d => d.uptime)).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 