"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface GlassCardProps {
  children?: React.ReactNode
  className?: string
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void
  style?: React.CSSProperties
}

interface FeatureGlassCardProps {
  feature: {
    title: string
    description: string
    icon: string
  }
  index?: number
  className?: string
}

export function GlassCard({ children, className = "", onMouseMove, style, ...props }: GlassCardProps) {
  return (
    <Card 
      className={`relative border backdrop-blur-2xl shadow-lg hover:shadow-xl transition-all duration-500 group overflow-hidden ${className}`}
      onMouseMove={onMouseMove}
      style={style}
      {...props}
    >
      {children}
    </Card>
  )
}

export function FeatureGlassCard({ feature, index, className = "" }: FeatureGlassCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePosition({ x, y })
  }

  return (
    <GlassCard 
      className={className}
      onMouseMove={handleMouseMove}
      style={{
        background: mousePosition.x === 0 && mousePosition.y === 0 
          ? 'rgba(255, 255, 255, 0.15)' // Light mode fallback
          : `
            radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
              rgba(59, 130, 246, 0.08) 0%, 
              rgba(59, 130, 246, 0.02) 50%, 
              transparent 100%
            ),
            rgba(255, 255, 255, 0.15)
          `,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        // @ts-ignore
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`,
      } as React.CSSProperties}
    >
      {/* Dynamic lighting overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), 
            rgba(59, 130, 246, 0.06) 0%, 
            rgba(59, 130, 246, 0.02) 50%, 
            transparent 80%
          )`
        }}
      />
      
      {/* Minimal glass reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        <CardHeader>
          <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-primary/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm border border-border shadow-md group-hover:shadow-lg transition-shadow duration-300">
            <span className="text-2xl filter drop-shadow-sm">{feature.icon}</span>
          </div>
                      <CardTitle className="text-xl text-foreground font-semibold tracking-tight">
            {feature.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
                      <CardDescription className="text-muted-foreground text-base leading-relaxed">
            {feature.description}
          </CardDescription>
        </CardContent>
      </div>
      
      {/* Subtle border highlight */}
      <div className="absolute inset-0 rounded-lg border border-white/50 dark:border-white/15 pointer-events-none" />
      
      {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </GlassCard>
  )
} 