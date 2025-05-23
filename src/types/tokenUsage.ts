export type TokenSourceType = 'system' | 'client';

export interface TokenUsage {
  id: string;
  organization_id: string;
  prompt_id?: string | null;
  customer_id?: string | null;
  chat_id?: string | null;
  integration_id?: string | null;
  token_source: TokenSourceType;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd?: number | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MonthlyTokenUsageReport {
  month_year: string;
  token_source: TokenSourceType;
  model_name: string;
  total_usage_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_tokens_per_usage: number;
}

export interface CustomerTokenUsageReport {
  customer_id: string;
  customer_name: string;
  total_usage_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface TokenUsageFilterOptions {
  organization_id: string;
  start_date?: string;
  end_date?: string;
  token_source?: TokenSourceType;
  customer_id?: string;
  chat_id?: string;
  integration_id?: string;
  model_name?: string;
}

export interface TokenUsageStats {
  total_tokens: number;
  total_cost_usd: number;
  system_tokens: number;
  client_tokens: number;
  system_cost_usd: number;
  client_cost_usd: number;
  usage_count: number;
  unique_customers: number;
  most_used_model: string;
} 