import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://grejfejbxalkhleqctxg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZWpmZWpieGFsa2hsZXFjdHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzcwODcsImV4cCI6MjA4NjIxMzA4N30.b-ICyyouuU9oLKzf7MXSUXY5eM7risZgd6XfQrKkTM0'

export const supabase = createClient(supabaseUrl, supabaseKey)