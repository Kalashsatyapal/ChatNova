// supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qqkbfunfwixklqodgzwt.supabase.co'; // Replace with your actual URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxa2JmdW5md2l4a2xxb2Rnend0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMzMjIzMywiZXhwIjoyMDU4OTA4MjMzfQ.RilAbY8TFuq18lFuBfCp8f7N2qocG69rPUYry-MdpDs'; // Replace with your anon key

if (!supabaseKey) {
  throw new Error('supabaseKey is required.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);