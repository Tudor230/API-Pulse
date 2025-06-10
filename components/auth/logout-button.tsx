"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={isLoading}
      size="sm"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  )
} 