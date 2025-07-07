"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddNotificationChannel from '@/components/dashboard/alerts/add-notification-channel'
import NotificationChannelsList from '@/components/dashboard/alerts/notification-channels-list'
import { Bell, Settings, History } from 'lucide-react'

export default function AlertsPageClient() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleChannelSuccess = () => {
    // Trigger a refresh of the notification channels list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <Tabs defaultValue="channels" className="space-y-8">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="channels" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Notification Channels
        </TabsTrigger>
        <TabsTrigger value="rules" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alert Rules
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Alert History
        </TabsTrigger>
      </TabsList>

      {/* Notification Channels Tab */}
      <TabsContent value="channels" className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Channel */}
          <div>
            <AddNotificationChannel onSuccess={handleChannelSuccess} />
          </div>

          {/* List Existing Channels */}
          <div>
            <NotificationChannelsList refreshTrigger={refreshTrigger} />
          </div>
        </div>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              About Notification Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">📧 Email Alerts</h4>
              <p className="text-sm text-muted-foreground">
                Receive detailed email notifications with monitor status, response times, and actionable insights.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">📱 SMS Alerts</h4>
              <p className="text-sm text-muted-foreground">
                Get instant text message alerts for critical monitor failures. Requires Twilio configuration.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">🔗 Webhook Alerts</h4>
              <p className="text-sm text-muted-foreground">
                Integrate with your existing tools by sending JSON payloads to your webhook endpoints.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Alert Rules Tab */}
      <TabsContent value="rules" className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Alert Rules</CardTitle>
            <CardDescription>
              Configure which monitors trigger alerts and when
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Alert Rules Management</h3>
              <p className="text-muted-foreground mb-4">
                Alert rules configuration will be available soon. For now, alerts are automatically
                triggered when monitors go down or recover.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Alert History Tab */}
      <TabsContent value="history" className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Alert History</CardTitle>
            <CardDescription>
              View recent alert notifications and their delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Alert History</h3>
              <p className="text-muted-foreground mb-4">
                Alert history tracking will be available soon. All sent alerts are logged
                for debugging and audit purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
} 