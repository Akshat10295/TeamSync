import { createClient } from '@supabase/supabase-js'

// We will use import.meta.env for Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// In development, if VITE_SUPABASE_URL is missing, we use a mock or throw an error.
// For now, these should be supplied via a .env file inside the /client directory.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true
    }
  }
)
