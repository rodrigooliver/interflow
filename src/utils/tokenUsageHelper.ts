import { TokenUsageService } from '../services/tokenUsageService';

/**
 * Calcula o custo estimado baseado no modelo e tokens
 * Preços aproximados (em USD por 1000 tokens)
 */
export function calculateEstimatedCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const modelPricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'gemini-pro': { input: 0.0005, output: 0.0015 },
    'llama-2-70b': { input: 0.0007, output: 0.0009 }
  };

  const pricing = modelPricing[modelName.toLowerCase()];
  
  if (!pricing) {
    // Preço padrão se o modelo não estiver na lista
    return ((inputTokens + outputTokens) / 1000) * 0.002;
  }

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Formata números de tokens para exibição
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
}

/**
 * Formata valores monetários para exibição
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
}

/**
 * Obtém o período do mês atual para relatórios
 */
export function getCurrentMonthPeriod(): { year: number; month: number; startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const startDate = new Date(year, now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  return { year, month, startDate, endDate };
}

/**
 * Obtém o período dos últimos 30 dias
 */
export function getLast30DaysPeriod(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

/**
 * Verifica se o uso de tokens está dentro do limite mensal (se houver)
 */
export async function checkTokenUsageLimit(
  organizationId: string,
  monthlyLimit?: number
): Promise<{ withinLimit: boolean; currentUsage: number; percentage: number }> {
  if (!monthlyLimit) {
    return { withinLimit: true, currentUsage: 0, percentage: 0 };
  }

  const { year, month } = getCurrentMonthPeriod();
  const report = await TokenUsageService.getMonthlyReport(organizationId, year, month, 'system');
  
  const currentUsage = report.reduce((sum, item) => sum + item.total_tokens, 0);
  const percentage = (currentUsage / monthlyLimit) * 100;
  
  return {
    withinLimit: currentUsage <= monthlyLimit,
    currentUsage,
    percentage
  };
}

/**
 * Determina a fonte do token baseado na presença de integration_id
 */
export function determineTokenSource(integrationId?: string | null): 'system' | 'client' {
  return integrationId ? 'client' : 'system';
}

/**
 * Gera metadados padrão para registros de uso de token
 */
export function generateTokenUsageMetadata(
  context: string,
  additionalMetadata?: Record<string, unknown>
): Record<string, unknown> {
  return {
    context,
    timestamp: new Date().toISOString(),
    ...additionalMetadata
  };
} 