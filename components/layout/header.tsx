"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LogoFull, LogoMark } from "@/components/ui/logo"
import { useTheme } from "next-themes"
import { Menu, X } from "lucide-react"

interface HeaderProps {
  user?: {
    id: string
    email?: string
  } | null
}

export function Header({ user }: HeaderProps) {
  const { theme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Logo - Left Side */}
            <div className="flex items-center">
              <Link href={user ? "/dashboard" : "/"}>
                {/* Show full logo on larger screens, mark on mobile */}
                <div className="hidden sm:block">
                  <LogoFull size="md" animated />
                </div>
                <div className="sm:hidden">
                  <LogoMark size="md" animated />
                </div>
              </Link>
            </div>

            {/* Navigation Links - Centered (Desktop only) */}
            <nav className="hidden lg:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
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
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ThemeToggle />
              {user ? (
                // Authenticated user menu
                <>
                  <div className="hidden md:block">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-white/20 dark:border-slate-700/50 shadow-lg">
                      {user.email}
                    </span>
                  </div>
                  <LogoutButton />
                </>
              ) : (
                // Unauthenticated auth buttons
                <>
                  <div className="hidden sm:block mt-1 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md rounded-full border border-white/20 dark:border-slate-700/50 shadow-lg">
                    <Button asChild variant="ghost" className="text-slate-700 dark:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/30 transition-all duration-300 border-0 bg-transparent rounded-full">
                      <Link href="/login">
                        Sign In
                      </Link>
                    </Button>
                  </div>
                  <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 backdrop-blur-md rounded-full border ${borderColor} shadow-lg ${shadowColor} mt-1`}>
                    <Button asChild className="bg-transparent hover:bg-white/10 text-white border-0 shadow-none transition-all duration-300 rounded-full text-sm px-3 sm:px-4">
                      <Link href="/sign-up">
                        <span className="hidden sm:inline">Get Started</span>
                        <span className="sm:hidden">Start</span>
                      </Link>
                    </Button>
                  </div>
                </>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden ml-2 text-slate-700 dark:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/30"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-full left-0 right-0 z-50 mt-1">
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 dark:border-slate-700/50 rounded-lg shadow-xl mx-4 overflow-hidden">
                <nav className="flex flex-col py-2">
                  {user ? (
                    // Authenticated mobile navigation
                    <>
                      <Link
                        href="/dashboard"
                        className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/monitors"
                        className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Monitors
                      </Link>
                      <Link
                        href="/alerts"
                        className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Alerts
                      </Link>
                      <div className="px-4 py-2 border-t border-slate-200/50 dark:border-slate-700/50 mt-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          {user.email}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Unauthenticated mobile navigation
                    <>
                      <Link
                        href="/#features"
                        className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Features
                      </Link>
                      <Link
                        href="/#pricing"
                        className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Pricing
                      </Link>
                      <Link
                        href="/#docs"
                        className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Docs
                      </Link>
                      <div className="px-4 py-2 border-t border-slate-200/50 dark:border-slate-700/50 mt-2">
                        <Button asChild variant="ghost" className="w-full justify-start mb-2 text-slate-700 dark:text-slate-200">
                          <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                            Sign In
                          </Link>
                        </Button>
                      </div>
                    </>
                  )}
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 