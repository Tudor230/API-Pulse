import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "icon" | "full"
  animated?: boolean
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
  xl: "w-16 h-16"
}

export function Logo({ 
  className, 
  size = "md", 
  variant = "icon",
  animated = false 
}: LogoProps) {
  const baseClasses = sizeClasses[size]
  
  if (variant === "full") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Logo size={size} animated={animated} />
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          API Pulse
        </span>
      </div>
    )
  }

  return (
    <div className={cn(baseClasses, "relative bg-transparent", className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Main circle background */}
        <circle
          cx="16"
          cy="16"
          r="15"
          fill="url(#logoGradient)"
          stroke="rgba(0, 0, 0, 0.1)" // Added a subtle, dark outline
          strokeWidth="1" // Defines the thickness of the outline
        />

        {/* Pulse rings with animation */}
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="0.5"
          className={animated ? "animate-ping" : ""}
          style={animated ? { animationDuration: '2s' } : {}}
        />
        <circle
          cx="16"
          cy="16"
          r="9"
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="0.5"
          className={animated ? "animate-ping" : ""}
          style={animated ? { animationDuration: '2.5s', animationDelay: '0.5s' } : {}}
        />

        {/* Central pulse wave/heartbeat */}
        <g transform="translate(16, 16)">
          {/* Pulse line across center */}
          <path
            d="M -8 0 L -4 0 L -2 -4 L 0 4 L 2 -4 L 4 0 L 8 0"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
            className={animated ? "animate-pulse" : ""}
          />
        </g>
      </svg>
    </div>
  )
}

export function LogoMark({ className, ...props }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="icon" className={className} {...props} />
}

export function LogoFull({ className, ...props }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="full" className={className} {...props} />
} 