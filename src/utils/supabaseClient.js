import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyxoffulgvtnzqpzbkle.supabase.co';
const supabaseAnonKey = 'sb_publishable_gEYeDIfgB9N-UP3aadnijw_kWsHW4pN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
