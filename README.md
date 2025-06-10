# API Pulse

An API monitoring and alerting service built with Next.js 14, Supabase, and shadcn/ui.

## Features

- 🔍 **API Monitoring**: Monitor multiple API endpoints for uptime and performance
- 📊 **Dashboard**: Real-time monitoring dashboard with status cards and tables
- 📧 **Alerts**: Email notifications via Resend when APIs go down
- 🔐 **Authentication**: Secure user authentication with Supabase
- ⚡ **Real-time**: Live updates and notifications
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Email**: Resend
- **Deployment**: Vercel
- **Cron Jobs**: Vercel Cron Jobs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Resend account (for email alerts)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables:

   ```bash
   cp env.example .env.local
   ```

4. Update `.env.local` with your configuration:

   - Supabase project URL and keys
   - Resend API key
   - Cron secret (generate a random string)

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

See `env.example` for all required environment variables.

## Database Schema

The application uses Supabase with Row Level Security (RLS) enabled. The main table is `monitors` which stores API endpoint information and monitoring data.

## Architecture

- **Server Components**: Used by default for data fetching
- **Client Components**: Only when interactivity is needed
- **API Routes**: Backend logic in `app/api/` directory
- **Cron Jobs**: Background monitoring via `/api/cron` endpoint

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## License

ISC
