import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AlertType } from "./supabase-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function validateChannelConfig(type: AlertType, config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (type) {
    case 'email':
      if (!config.email) {
        errors.push('Email address is required')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
        errors.push('Invalid email address format')
      }
      break

    case 'sms':
      if (!config.phone) {
        errors.push('Phone number is required')
      } else if (!/^\+[1-9]\d{1,14}$/.test(config.phone)) {
        errors.push('Phone number must be in international format (e.g., +1234567890)')
      }
      break

    case 'webhook':
      if (!config.webhook_url) {
        errors.push('Webhook URL is required')
      } else {
        try {
          const url = new URL(config.webhook_url)
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Webhook URL must use HTTP or HTTPS protocol')
          }
        } catch {
          errors.push('Invalid webhook URL format')
        }
      }
      break

    default:
      errors.push(`Unsupported channel type: ${type}`)
  }

  return { valid: errors.length === 0, errors }
} 
