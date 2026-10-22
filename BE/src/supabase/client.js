import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

if (!config.supabaseUrl || !config.supabaseKey) {
  throw new Error('[BE] SUPABASE_URL hoặc SUPABASE_KEY chưa được cấu hình trong .env');
}

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);
