"use client"

import { useEffect, useState } from "react"

export function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <>
      {/* Page-wide Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-secondary/30 to-background"></div>
      <div className="fixed inset-0 bg-gradient-to-tl from-primary/8 via-transparent to-accent/8"></div>
      
      {/* Mouse-following spotlight */}
      <div 
        className="fixed w-96 h-96 bg-primary/8 dark:bg-primary/5 rounded-full filter blur-3xl transition-all duration-300 ease-out pointer-events-none z-0"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
        }}
      ></div>
      
      {/* Animated Mesh Gradients using theme colors */}
      <div className="fixed top-0 -left-4 w-72 h-72 bg-primary/30 dark:bg-primary/20 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-40 dark:opacity-30 animate-blob z-0"></div>
      <div className="fixed top-0 -right-4 w-72 h-72 bg-accent/30 dark:bg-accent/20 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-40 dark:opacity-30 animate-blob animation-delay-2000 z-0"></div>
      <div className="fixed top-1/3 left-20 w-72 h-72 bg-secondary/40 dark:bg-secondary/30 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-50 dark:opacity-30 animate-blob animation-delay-4000 z-0"></div>
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-primary/25 dark:bg-primary/15 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-35 dark:opacity-25 animate-blob animation-delay-1000 z-0"></div>
      
      {/* Interactive gradient that follows mouse */}
      <div 
        className="fixed w-72 h-72 bg-gradient-radial from-primary/15 to-transparent dark:from-primary/10 rounded-full filter blur-2xl transition-all duration-500 ease-out pointer-events-none z-0"
        style={{
          left: mousePosition.x - 144,
          top: mousePosition.y - 144,
        }}
      ></div>
      
      {/* Grid Pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-8 dark:opacity-5 z-0"></div>
    </>
  )
} 