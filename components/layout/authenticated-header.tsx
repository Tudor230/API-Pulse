import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"

interface AuthenticatedHeaderProps {
  userEmail: string
}

export function AuthenticatedHeader({ userEmail }: AuthenticatedHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900">API Pulse</span>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/dashboard" 
              className="text-gray-900 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link 
              href="/monitors" 
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              Monitors
            </Link>
            <Link 
              href="/alerts" 
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              Alerts
            </Link>
          </nav>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <span className="text-sm text-gray-700">
                {userEmail}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  )
} 