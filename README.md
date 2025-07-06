
# API Pulse

API Pulse is a modern, full-stack API monitoring and alerting platform. It leverages Next.js 14, Supabase, AWS Lambda, and SQS to provide scalable, real-time monitoring, alerting, and analytics for your APIs.

## Features

- 🔍 **API Monitoring**: Monitor multiple API endpoints for uptime, performance, and reliability
- 📊 **Dashboard**: Real-time dashboard with status cards, analytics, and incident history
- 🛠️ **Bulk Operations**: Enable, disable, or delete multiple monitors at once
- 📧 **Alerts**: Email notifications via Resend and (optionally) SMS via Twilio
- 🔐 **Authentication**: Secure user authentication with Supabase
- ⚡ **Real-time**: Live updates and notifications
- ☁️ **Serverless Backend**: AWS Lambda workers process monitoring jobs from SQS queues
- 🕒 **Custom Intervals**: Flexible scheduling for each monitor
- 🏷️ **Tagging & Filtering**: Organize and filter monitors by status, interval, or name
- 🎨 **Modern UI**: Built with shadcn/ui, Lucide icons, and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router, React Server/Client Components)
- **Backend**: API routes (Next.js), AWS Lambda (monitoring worker)
- **Database**: Supabase (PostgreSQL, RLS enabled)
- **Queueing**: AWS SQS (multiple queues for checks, alerts, priority, DLQ)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS, shadcn/ui, Lucide icons
- **Email**: Resend (email alerts), Twilio (optional SMS)
- **Deployment**: Vercel, AWS

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database and auth)
- AWS account (for Lambda, SQS, IAM)
- Resend account (for email alerts)
- (Optional) Twilio account (for SMS alerts)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   - See the list of required variables in the section below. Create a `.env` file in the root directory.
4. Update `.env` with your configuration mentioned in the next section.
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables


You must set the following environment variables in `.env`:
- `CRON_SECRET` - Auth secret for the scheduler
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for backend jobs)
- `RESEND_API_KEY` - Resend API key for email alerts
- `RESEND_FROM_EMAIL` - Email to send messages from
- `AWS_REGION` - AWS region for Lambda/SQS
- `AWS_ACCESS_KEY_ID` - AWS access key for Lambda/SQS
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for Lambda/SQS
- `SQS_QUEUE_MONITORCHECKS` - SQS queue URL for monitor checks
- `SQS_QUEUE_PRIORITYCHECKS` - SQS queue URL for priority checks
- `SQS_QUEUE_ALERTPROCESSING` - SQS queue URL for alert processing
- `SQS_QUEUE_SCHEDULER` - SQS queue URL for scheduler
- `SQS_QUEUE_DLQ_FIFO` - SQS dead letter queue (FIFO) URL
- `SQS_QUEUE_DLQ_STANDARD` - SQS dead letter queue (standard) URL
- (Optional) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - for SMS alerts

You can check your environment config with:
```bash
npm run test-sqs config
```

## Database Schema

The application uses Supabase with Row Level Security (RLS) enabled. Main tables:

- `monitors`: API endpoint definitions and config
- `monitoring_history`: Historical check results
- `alert_rules`: Alerting rules per monitor
- `notification_channels`: Email/SMS destinations
- `alert_logs`: Stores all alert events and notification delivery logs

## Architecture

- **Frontend**: Next.js 14 (App Router, React Server/Client Components)
- **API Routes**: All backend logic in `app/api/` (monitors, alerts, notification channels, etc.)
- **Supabase**: Stores user, monitor, and history data
- **AWS Lambda**: Runs monitoring jobs, triggered by SQS events
- **AWS SQS**: Queues for monitor checks, priority checks, alerts, and DLQ
- **AWS EventBridge**: Triggers the scheduler Lambda on a schedule (replaces Vercel Cron)
- **CloudWatch**: Logs, alarms, and dashboards for Lambda and SQS
- **Infrastructure as Code**: CloudFormation YAML in `infrastructure/aws/`

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run test-sqs test` - Run SQS client integration test
- `npm run test-sqs health` - Check SQS queue health
- `npm run test-sqs config` - Check environment config

## Infrastructure

See `infrastructure/aws/lambda-infrastructure.yaml` for CloudFormation resources:
- Lambda worker, IAM roles, SQS queues, event source mappings, CloudWatch alarms, and dashboards

## License

MIT
