import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'interflow_vite' }
  },
  // Configure realtime
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// // Add realtime subscription for chat channels
// supabase
//   .channel('chat_channels')
//   .on('postgres_changes', {
//     event: '*',
//     schema: 'public',
//     table: 'chat_channels'
//   }, (payload) => {
//     console.log('Chat channel changed:', payload);
//   })
//   .subscribe();