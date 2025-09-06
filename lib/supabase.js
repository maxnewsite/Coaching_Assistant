// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Add more detailed logging to debug environment variables
console.log('Supabase URL available:', !!supabaseUrl)
console.log('Supabase Key available:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Database features will be disabled.')
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false // Disable auth persistence for simpler setup
      }
    })
  : null

// Enhanced helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  const configured = supabase !== null && supabaseUrl && supabaseAnonKey
  console.log('Supabase configuration check:', configured)
  return configured
}

// Helper to test connection
export const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }
  
  try {
    // Test with a simple query to check connection
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Supabase connection test successful')
    return { success: true }
  } catch (error) {
    console.error('Supabase connection test error:', error)
    return { success: false, error: error.message }
  }
}
