import { createHash } from 'crypto';

// Gera uma nova API key com prefixo
export function generateApiKey(prefix = 'sk'): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = btoa(String.fromCharCode(...randomBytes))
    .replace(/[+/]/g, '') // Remove caracteres especiais
    .slice(0, 32); // Limita o tamanho
  
  return `${prefix}_${key}`;
}

// Gera o hash da API key para armazenamento
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
} 