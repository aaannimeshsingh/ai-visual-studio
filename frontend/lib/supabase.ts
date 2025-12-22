import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging (remove after fixing)
console.log('Supabase URL:', supabaseUrl ? '✓ Loaded' : '✗ Missing');
console.log('Supabase Key:', supabaseAnonKey ? '✓ Loaded' : '✗ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables!\n' +
    `URL: ${supabaseUrl ? 'OK' : 'MISSING'}\n` +
    `Key: ${supabaseAnonKey ? 'OK' : 'MISSING'}\n` +
    'Make sure .env.local is in the frontend folder and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);