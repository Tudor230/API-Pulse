import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LogoFull, LogoMark } from "@/components/ui/logo"

interface HeaderProps {
  user?: {
    id: string
    email?: string
  } | null
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-secondary/30 backdrop-blur-xl border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          {/* Logo - Left Side */}
          <div className="flex items-center">
            <Link href={user ? "/dashboard" : "/"}>
              <LogoFull size="md" animated />
            </Link>
          </div>

          {/* Navigation Links - Centered */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            {user ? (
              // Authenticated navigation
              <>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/monitors"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  Monitors
                </Link>
                <Link
                  href="/alerts"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  Alerts
                </Link>
              </>
            ) : (
              // Unauthenticated navigation
              <>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  Pricing
                </Link>
                <Link
                  href="#docs"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  Docs
                </Link>
              </>
            )}
          </nav>

          {/* Auth Buttons / User Menu - Right Side */}
          <div className="flex items-center space-x-4 ml-auto">
            <ThemeToggle />
            {user ? (
              // Authenticated user menu
              <>
                <div className="hidden sm:block">
                  <span className="text-sm text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full border border-border/50">
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