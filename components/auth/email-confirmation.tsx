import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmailConfirmationProps {
  email: string
}

export function EmailConfirmation({ email }: EmailConfirmationProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            className="w-8 h-8 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent a confirmation link to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-gray-600">
          Click the link in the email to confirm your account and start monitoring your APIs.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
          <p className="font-medium mb-2">Didn&apos;t receive the email?</p>
          <ul className="text-left space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email address</li>
            <li>• Wait a few minutes for the email to arrive</li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3 pt-4">
          <Button asChild variant="outline">
            <Link href="/login">
              Go to Sign In
            </Link>
          </Button>
          
          <Link 
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </CardContent>
    </Card>
  )
} 