import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const PAYMENT_INFO = {
  method: 'Mobile Money',
  number: '0889554715',
  name: 'Randy Drakey Tomanee Jr.',
}

export const ORDERS_FUNCTION_URL = `${supabaseUrl}/functions/v1/orders`
export const ORDERS_FUNCTION_HEADERS = {
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
}
