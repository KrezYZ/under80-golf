import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bykfoersygrhtnlueibu.supabase.co';
const supabaseAnonKey = 'sb_publishable_kHByOAmw6bvIdRQYLsbgWQ_HYtABZXq';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Detect if Supabase is configured with a real key
export function isSupabaseConfigured(): boolean {
  return supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('PLACEHOLDER');
}

export const ADMIN_EMAILS = [
  'yuan_cristina@hotmail.com',
  'jibeimaoyi@163.com',
];
