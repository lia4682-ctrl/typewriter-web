import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szfgtyqxdmosjkjqsbvq.supabase.co'; // 뒤에 아무것도 붙이지 않음
const supabaseAnonKey = 'sb_publishable_tz3zt36eEaoPyAJ0dLUefA_NLvjiVyu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
