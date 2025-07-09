"use client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LogoFull, LogoMark } from "@/components/ui/logo"
import { useTheme } from "next-themes"

interface HeaderProps {
  user?: {
    id: string
    email?: string
  } | null
}

export function Header({ user }: HeaderProps) {
  const { theme } = useTheme()

  const shadowColor = theme === 'dark'
    ? 'shadow-blue-500/25'
    : 'shadow-blue-600/25'

  const borderColor = theme === 'dark'
    ? 'border-blue-400/30'
    : 'border-blue-500/30'

  return (
    <header className="sticky top-0 z-50">
      {/* Liquid glass background with gradient border */}
      <div className="relative">
        {/* Glass morphism background */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 dark:from-slate-800/40 dark:via-slate-900/20 dark:to-slate-800/40 backdrop-blur-2xl"></div>

        {/* Animated gradient border */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium relative group"
                  >
                    Dashboard
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    href="/monitors"
                    className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium relative group"
                  >
                    Monitors
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    href="/alerts"
                    className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium relative group"
                  >
                    Alerts
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                </>
              ) : (
                // Unauthenticated navigation
                <>
                  <Link
                    href="/#features"
                    className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium relative group"
                  >
                    Features
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    href="/#pricing"
                    className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium relative group"
                  >
                    Pricing
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    href="/#docs"
                    className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium relative group"
                  >
                    Docs
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                </>
              )}
            </nav>

            {/* Auth Buttons / User Menu - Right Side */}
            <div className="flex items-center space-x-3 ml-auto">
              <ThemeToggle />
              {user ? (
                // Authenticated user menu
                <>
                  <div className="hidden sm:block">
                    <span className="text-sm text-slate-600 dark:text-slate-300 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 dark:border-slate-700/50 shadow-lg">
                      {user.email}
                    </span>
                  </div>
                  <LogoutButton />
                </>
              ) : (
                // Unauthenticated auth buttons
                <>
                  <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-md rounded-full border border-white/20 dark:border-slate-700/50 shadow-lg">
                    <Button asChild variant="ghost" className="text-slate-700 dark:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/30 transition-all duration-300 border-0 bg-transparent rounded-full">
                      <Link href="/login">
                        Sign In
                      </Link>
                    </Button>
                  </div>
                  <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 backdrop-blur-md rounded-full border ${borderColor} shadow-lg ${shadowColor}`}>
                    <Button asChild className="bg-transparent hover:bg-white/10 text-white border-0 shadow-none transition-all duration-300 rounded-full">
                      <Link href="/sign-up">
                        Get Started
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 