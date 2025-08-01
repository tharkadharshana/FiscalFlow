// src/lib/actions.ts
'use server';

import { parseReceipt } from '@/ai/flows/parse-receipt';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import { createTripPlan } from '@/ai/flows/create-trip-plan-flow';
import { createMonthlyBudgets } from '@/ai/flows/create-monthly-budgets-flow';
import { assistantAction as assistantActionFlow } from '@/ai/flows/assistant-flow';
import { analyzeTaxes } from '@/ai/flows/analyze-taxes-flow';
import { createSavingsGoal } from '@/ai/flows/create-savings-goal-flow';
import { parseBankStatement } from '@/ai/flows/parse-bank-statement-flow';
import { createChecklist } from '@/ai/flows/create-checklist-flow';

import type {
    AnalyzeTaxesInput,
    AnalyzeTaxesOutput,
    AssistantActionInput,
    CreateTripPlanInput,
    CreateTripPlanOutput,
    CreateMonthlyBudgetsInput,
    CreateMonthlyBudgetsOutput,
    CreateSavingsGoalInput,
    CreateSavingsGoalOutput,
    GenerateInsightsInput,
    GenerateInsightsOutput,
    ParseBankStatementInput,
    ParseBankStatementOutput,
    ParseReceiptInput,
    ParseReceiptOutput,
    VoiceAction,
    CreateChecklistInput,
    CreateChecklistOutput
} from '@/types/schemas';

import { logger } from './logger';
import type { CoinGeckoMarketData } from '@/types';

// Result types for actions, wrapping the output schema type or an error object.
type SuggestionResult = ParseReceiptOutput | { error: string };
type InsightsResult = GenerateInsightsOutput | { error: string };
type TripPlanResult = CreateTripPlanOutput | { error: string };
type MonthlyBudgetsResult = CreateMonthlyBudgetsOutput | { error: string };
type AssistantResult = VoiceAction | { error: string };
type TaxAnalysisResult = AnalyzeTaxesOutput | { error: string };
type ParseDocumentResult = { text: string } | { error: string };
type SavingsGoalResult = CreateSavingsGoalOutput | { error: string };
type CoinGeckoResult = CoinGeckoMarketData[] | { error: string };
type BankStatementParseResult = ParseBankStatementOutput | { error: string };
type ChecklistResult = CreateChecklistOutput | { error: string };

// --- Helper for handling AI errors ---
function handleAIError(error: any, defaultMessage: string): { error: string } {
    logger.error(defaultMessage, error as Error, { error });
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('model is overloaded')) {
        return { error: 'The AI model is temporarily busy. Please try again in a few moments.' };
    }
    
    return { error: errorMessage };
}


// ------------------------------
// ACTION FUNCTIONS
// ------------------------------

export async function getCoinGeckoMarketData(
  params: { coinIds?: string[]; page?: number; perPage?: number } = {}
): Promise<CoinGeckoResult> {
  const { coinIds, page = 1, perPage = 25 } = params;
  const vsCurrency = 'usd';
  let url: string;

  if (coinIds && coinIds.length > 0) {
    url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${coinIds.join(',')}`;
  } else {
    url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
  }
  
  try {
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `CoinGecko API request failed with status ${response.status}`);
    }
    const data: CoinGeckoMarketData[] = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching from CoinGecko', error as Error, { url });
    return { error: (error as Error).message };
  }
}


export async function parseDocumentAction(
  input: ParseReceiptInput
): Promise<ParseDocumentResult> {
  try {
    const result = await parseReceipt(input);
    if (!result) {
        throw new Error('The AI action returned an undefined result.');
    }
    if (result.rawText) {
      return { text: result.rawText };
    }
    return { error: 'Could not extract any text from the document.' };
  } catch (error) {
    return handleAIError(error, 'Failed to analyze document.');
  }
}

export async function parseReceiptAction(
  input: ParseReceiptInput
): Promise<SuggestionResult> {
  if (!input.photoDataUri) {
    return { error: 'Please provide an image of the receipt.' };
  }
  
  try {
    const result = await parseReceipt(input);
    if (!result) {
        throw new Error('The AI action returned an undefined result.');
    }
    return result;
  } catch (error) {
    return handleAIError(error, 'Failed to analyze receipt.');
  }
}

export async function generateInsightsAction(
    input: GenerateInsightsInput
): Promise<InsightsResult> {
    try {
        const result = await generateInsights(input);
        return result;
    } catch (error) {
        return handleAIError(error, 'Failed to generate insights.');
    }
}

export async function createTripPlanAction(
    payload: CreateTripPlanInput
): Promise<TripPlanResult> {
    try {
        const result = await createTripPlan(payload);
        return result;
    } catch (error) {
        return handleAIError(error, 'Failed to generate trip plan.');
    }
}

export async function createChecklistAction(
  payload: CreateChecklistInput
): Promise<ChecklistResult> {
  try {
      const result = await createChecklist(payload);
      return result;
  } catch (error) {
      return handleAIError(error, 'Failed to generate checklist.');
  }
}

export async function createMonthlyBudgetsAction(
    payload: CreateMonthlyBudgetsInput
): Promise<MonthlyBudgetsResult> {
    try {
        const result = await createMonthlyBudgets(payload);
        return result;
    } catch (error) {
        return handleAIError(error, 'Failed to generate budgets.');
    }
}

export async function assistantAction(
    input: AssistantActionInput
): Promise<AssistantResult> {
    try {
        const result = await assistantActionFlow(input);
        return result;
    } catch (error) {
        const handledError = handleAIError(error, 'Error processing voice command.');
        return { action: 'unknown', reason: handledError.error };
    }
}

export async function analyzeTaxesAction(
    payload: AnalyzeTaxesInput
): Promise<TaxAnalysisResult> {
    try {
        const result = await analyzeTaxes(payload);
        return result;
    } catch (error) {
        return handleAIError(error, 'Failed to analyze taxes.');
    }
}

export async function createSavingsGoalAction(
    payload: CreateSavingsGoalInput
): Promise<SavingsGoalResult> {
    try {
        const result = await createSavingsGoal(payload);
        return result;
    } catch (error) {
        return handleAIError(error, 'Failed to generate savings goal.');
    }
}

export async function parseBankStatementAction(
    payload: ParseBankStatementInput
): Promise<BankStatementParseResult> {
    if (!payload.fileDataUri) {
        return { error: 'Please provide a bank statement file.' };
    }
    
    try {
        const result = await parseBankStatement(payload);
        return result;
    } catch (error) {
        return handleAIError(error, 'Failed to parse bank statement.');
    }
}
