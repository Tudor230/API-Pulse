"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="mt-1 text-sm text-slate-600 dark:text-slate-300 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md px-4 py-2 border border-white/20 dark:border-slate-700/50 shadow-lg">
        <Sun className="h-[1rem] w-[1rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
      case "dark":
        return <Moon className="h-[1.2rem] w-[1.2rem]" />
      default:
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
    }
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="mt-1 text-sm text-slate-600 dark:text-slate-300 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md px-4 py-2 border border-white/20 dark:border-slate-700/50 shadow-lg">
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 