# Alert System Setup Guide

This guide walks you through setting up email and SMS alerts for your API monitoring service.

## Overview

The alert system supports three types of notifications:

- **📧 Email Alerts**: Detailed email notifications via Resend
- **📱 SMS Alerts**: Instant text messages via Twilio
- **🔗 Webhook Alerts**: JSON payloads to your endpoints

## Database Setup

1. Run the alerts database migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of lib/migrations/004_alerts_system.sql
```

This creates the necessary tables for notification channels, alert rules, and alert logs.

## Email Alerts Setup (Resend)

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys** in your dashboard
3. Create a new API key

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=alerts@yourdomain.com
```

**Important**: Make sure `RESEND_FROM_EMAIL` uses a domain you've verified with Resend.

### 3. Domain Verification

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Add the required DNS records
4. Verify the domain

## SMS Alerts Setup (Twilio)

### 1. Get Twilio Credentials

1. Sign up at [twilio.com](https://twilio.com)
2. Get a phone number from Twilio Console
3. Find your Account SID and Auth Token in the console

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Twilio SMS Service
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Important**: `TWILIO_PHONE_NUMBER` must be a Twilio phone number in international format.

## Complete Environment Variables

Your `.env.local` should include:

```bash
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_secure_cron_secret

# Alert System
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=alerts@yourdomain.com
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Using the Alert System

### 1. Create Notification Channels

1. Go to **Alerts** in your dashboard
2. Click **Notification Channels** tab
3. Add Email, SMS, or Webhook channels
4. Verify email/phone when prompted

### 2. Configure Alert Rules

Alert rules are automatically created when you add notification channels. Alerts trigger when:

- **Monitor goes down**: HTTP errors, timeouts, or unreachable endpoints
- **Monitor recovers**: When a down monitor becomes available again
- **Cooldown period**: Prevents spam by limiting alert frequency (default: 60 minutes)

### 3. Webhook Payload Format

Webhook alerts send JSON payloads like this:

```json
{
  "monitor": {
    "id": "monitor-uuid",
    "name": "My API",
    "url": "https://api.example.com"
  },
  "alert": {
    "trigger_status": "down",
    "previous_status": "up",
    "consecutive_failures": 2,
    "response_time": null,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "alert_type": "webhook",
    "source": "api-pulse"
  }
}
```

## Testing Alerts

### Test Email Alerts

1. Create an email notification channel
2. Temporarily set a monitor URL to an invalid endpoint
3. Wait for the monitoring check to fail
4. Check your email for the alert

### Test SMS Alerts

1. Create an SMS notification channel with your phone number
2. Use international format: `+1234567890`
3. Test the same way as email alerts

### Test Webhook Alerts

1. Use a service like [Webhook.site](https://webhook.site) to get a test URL
2. Create a webhook notification channel with that URL
3. Trigger an alert and check the webhook site for the payload

## Troubleshooting

### Email Alerts Not Working

- ✅ Check `RESEND_API_KEY` is correct
- ✅ Verify `RESEND_FROM_EMAIL` domain in Resend
- ✅ Check notification channel is verified and active
- ✅ Look for errors in deployment logs

### SMS Alerts Not Working

- ✅ Check Twilio credentials are correct
- ✅ Verify `TWILIO_PHONE_NUMBER` is in international format
- ✅ Make sure you have Twilio credits
- ✅ Check phone number is in international format (+country code)

### Webhook Alerts Not Working

- ✅ Verify webhook URL is accessible from the internet
- ✅ Check webhook endpoint accepts POST requests
- ✅ Ensure endpoint responds with 2xx status codes
- ✅ Look for timeout issues (webhook timeout is 10 seconds)

### General Issues

- ✅ Run the database migration (`004_alerts_system.sql`)
- ✅ Restart your application after adding environment variables
- ✅ Check that monitors are active and configured correctly
- ✅ Verify alert rules are active in the database

## Alert Features

### Smart Cooldowns

- Prevents alert spam with configurable cooldown periods
- Default: 60 minutes between alerts for the same monitor/channel

### Consecutive Failure Threshold

- Only trigger alerts after N consecutive failures
- Reduces false positives from temporary network issues
- Default: 1 failure (immediate alerts)

### Recovery Notifications

- Optional alerts when monitors come back online
- Helps track incident resolution
- Disabled by default

### Detailed Email Templates

- Professional HTML email templates
- Include monitor details, response times, and status history
- Actionable insights and troubleshooting tips

## Support

If you need help setting up alerts:

1. Check the application logs for error messages
2. Verify all environment variables are set correctly
3. Test notification channels individually
4. Check Supabase database for alert logs and configurations

The alert system logs all attempts in the `alert_logs` table for debugging purposes.
