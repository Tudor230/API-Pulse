# Deployment Guide

## Environment Variables

When deploying to production, you need to set the following environment variables:

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site Configuration (IMPORTANT for OAuth)
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

## OAuth Configuration

### Step 1: Set Production URL

In your deployment platform (Vercel, Netlify, etc.), add the environment variable:

```
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com
```

**Do NOT include a trailing slash.**

### Step 2: Update Supabase OAuth Settings

1. Go to your Supabase project dashboard
2. Navigate to Authentication > URL Configuration
3. Add your production domain to **Site URL**: `https://your-actual-domain.com`
4. Add your callback URL to **Redirect URLs**: `https://your-actual-domain.com/auth/callback`

### Step 3: Google OAuth Configuration

If using Google OAuth, update your Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to APIs & Services > Credentials
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
   - `https://your-actual-domain.com/auth/callback`

## Common Issues

### Issue: OAuth redirects to localhost:3000

**Cause**: The `NEXT_PUBLIC_SITE_URL` environment variable is not set in production.

**Solution**:

1. Set `NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com` in your deployment platform
2. Redeploy your application
3. Clear your browser cache and cookies
4. Try OAuth again

### Issue: "Invalid redirect URL" error

**Cause**: The redirect URL is not configured in Supabase or Google OAuth settings.

**Solution**:

1. Check Supabase Authentication > URL Configuration
2. Ensure `https://your-actual-domain.com/auth/callback` is in the Redirect URLs list
3. For Google OAuth, check Google Cloud Console OAuth settings

## Local Development

For local development, the app will automatically use `http://localhost:3000`. No additional configuration needed.

## Vercel Deployment

If deploying to Vercel:

```bash
# Set environment variable in Vercel dashboard or via CLI
vercel env add NEXT_PUBLIC_SITE_URL production
# Then enter: https://your-vercel-app.vercel.app
```

## Netlify Deployment

If deploying to Netlify:

```bash
# In netlify.toml or Netlify dashboard
NEXT_PUBLIC_SITE_URL = "https://your-netlify-app.netlify.app"
```
