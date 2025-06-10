/**
 * Get the site URL for OAuth redirects
 * In production, use NEXT_PUBLIC_SITE_URL environment variable
 * In development, fall back to window.location.origin
 */
export function getSiteUrl(): string {
  // Check if we're running on the server or client
  if (typeof window !== 'undefined') {
    // Client-side: check for environment variable first, then fall back to window.location.origin
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  }
  
  // Server-side: use environment variable or fallback
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
} 