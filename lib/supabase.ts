import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szfgtyqxdmosjkjqsbvq.supabase.co'; // 뒤에 아무것도 붙이지 않음
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Zmd0eXF4ZG1vc2pranFzYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MDE3MjIsImV4cCI6MjEwNDA3NzcyMn0.OffYEWXnF2mkRid04MVQtVTZ7J__fGdbHHu_ZQTNmDo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
