import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("SUPABASE KEY MISSING in lib/supabase.ts");
  console.error("URL present:", !!supabaseUrl);
  console.error("Key present:", !!supabaseAnonKey);
  throw new Error('Missing Supabase environment variables');
}

console.log("Supabase Client Initialized. URL:", supabaseUrl.substring(0, 10) + "...");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

