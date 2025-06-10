// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error)
  
  // Common error types
  if (error.code === 'PGRST116') {
    return 'No data found'
  }
  
  if (error.code === '23505') {
    return 'This record already exists'
  }
  
  if (error.code === '42501') {
    return 'Access denied - check your permissions'
  }
  
  return error.message || 'An unexpected error occurred'
} 