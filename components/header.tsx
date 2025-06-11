import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoFull, LogoMark } from "@/components/ui/logo"

interface HeaderProps {
  user?: {
    id: string
    email?: string
  } | null
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={user ? "/dashboard" : "/"}>
              <LogoFull size="lg" animated />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              // Authenticated navigation
              <>
                <Link 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/monitors" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Monitors
                </Link>
                <Link 
                  href="/alerts" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Alerts
                </Link>
              </>
            ) : (
              // Unauthenticated navigation
              <>
                <Link 
                  href="#features" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Features
                </Link>
                <Link 
                  href="#pricing" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Pricing
                </Link>
                <Link 
                  href="#docs" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Docs
                </Link>
              </>
            )}
          </nav>

          {/* Auth Buttons / User Menu */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              // Authenticated user menu
              <>
                <div className="hidden sm:block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user.email}
                  </span>
                </div>
                <LogoutButton />
              </>
            ) : (
              // Unauthenticated auth buttons
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 