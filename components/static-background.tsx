export function StaticBackground() {
  return (
    <>
      {/* Page-wide Static Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-secondary/30 to-background"></div>
      <div className="fixed inset-0 bg-gradient-to-tl from-primary/8 via-transparent to-accent/8"></div>
      
      {/* Static Mesh Gradients using theme colors */}
      <div className="fixed top-0 -left-4 w-72 h-72 bg-primary/30 dark:bg-primary/20 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-40 dark:opacity-30 z-0"></div>
      <div className="fixed top-0 -right-4 w-72 h-72 bg-accent/30 dark:bg-accent/20 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-40 dark:opacity-30 z-0"></div>
      <div className="fixed top-1/3 left-20 w-72 h-72 bg-secondary/40 dark:bg-secondary/30 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-50 dark:opacity-30 z-0"></div>
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-primary/25 dark:bg-primary/15 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-35 dark:opacity-25 z-0"></div>
      
      {/* Static centered gradient */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-radial from-primary/15 to-transparent dark:from-primary/10 rounded-full filter blur-2xl pointer-events-none z-0"></div>
      
      {/* Grid Pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-8 dark:opacity-5 z-0"></div>
    </>
  )
} 