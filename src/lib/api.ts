import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Interceptor para adicionar token ou API key
api.interceptors.request.use(async (config) => {
  // Se tiver uma API key configurada, usa ela
  const apiKey = localStorage.getItem('api_key');
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
    return config;
  }

  // Caso contrário, usa o token do Supabase
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return config;
});

export default api; 