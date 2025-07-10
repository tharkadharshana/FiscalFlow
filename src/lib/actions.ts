
// src/lib/actions.ts
'use server';

import {
  parseReceipt,
  type ParseReceiptInput,
  type ParseReceiptOutput,
} from '@/ai/flows/parse-receipt';
import {
    generateInsights,
    type GenerateInsightsInput,
    type GenerateInsightsOutput,
} from '@/ai/flows/generate-insights-flow';
import {
    createFinancialPlan,
    type CreateFinancialPlanInput,
    type CreateFinancialPlanOutput,
} from '@/ai/flows/create-financial-plan-flow';
import {
    createMonthlyBudgets,
    type CreateMonthlyBudgetsInput,
    type CreateMonthlyBudgetsOutput,
} from '@/ai/flows/create-monthly-budgets-flow';
import {
    assistantAction as assistantActionFlow,
    type AssistantActionInput,
    type VoiceAction
} from '@/ai/flows/assistant-flow';
import {
    analyzeTaxes,
    type AnalyzeTaxesInput,
    type AnalyzeTaxesOutput,
} from '@/ai/flows/analyze-taxes-flow';
import {
    createSavingsGoal,
    type CreateSavingsGoalInput,
} from '@/ai/flows/create-savings-goal-flow';
import {
    createChecklist,
    type CreateChecklistInput,
    type CreateChecklistOutput,
} from '@/ai/flows/create-checklist-flow';
import { parseBankStatementFlow } from '@/ai/flows/parse-bank-statement-flow';
import { z } from 'genkit';
import { defaultCategories } from '@/data/mock-data';


import type { CreateSavingsGoalOutput } from '@/types';
import { logger } from './logger';
import type { CoinGeckoMarketData } from '@/types';


type SuggestionResult = ParseReceiptOutput | { error: string };
type InsightsResult = GenerateInsightsOutput | { error: string };
type FinancialPlanResult = CreateFinancialPlanOutput | { error: string };
type MonthlyBudgetsResult = CreateMonthlyBudgetsOutput | { error: string };
type AssistantResult = VoiceAction | { error: string };
type TaxAnalysisResult = AnalyzeTaxesOutput | { error: string };
type ParseDocumentResult = { text: string } | { error: string };
type SavingsGoalResult = CreateSavingsGoalOutput | { error: string };
type CoinGeckoResult = CoinGeckoMarketData[] | { error: string };
type ChecklistResult = CreateChecklistOutput | { error: string };
type BankStatementParseResult = z.infer<typeof ParseBankStatementOutputSchema> | { error: string };

// --- Bank Statement Schemas ---
const ParsedTransactionSchema = z.object({
    date: z.string().describe('The transaction date in YYYY-MM-DD format. If no year is present, assume the current year.'),
    description: z.string().describe('The full transaction description from the statement.'),
    amount: z.number().describe('The transaction amount. Use negative numbers for debits/expenses and positive for credits/income.'),
    category: z.string().describe(`A suggested category for this transaction. Must be one of the following: ${defaultCategories.join(', ')}`),
});
export const ParseBankStatementOutputSchema = z.object({
  transactions: z.array(ParsedTransactionSchema),
});
export const ParseBankStatementInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A bank statement file (like a PDF), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
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
    if (result.rawText) {
      return { text: result.rawText };
    }
    return { error: 'Could not extract any text from the document.' };
  } catch (error) {
    console.error('Error in parseDocumentAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze document.';
    return { error: errorMessage };
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
    return result;
  } catch (error) {
    console.error('Error in parseReceiptAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze receipt. Please try again.';
    return { error: errorMessage };
  }
}

export async function generateInsightsAction(
    input: GenerateInsightsInput
): Promise<InsightsResult> {
    try {
        const result = await generateInsights(input);
        return result;
    } catch (error) {
        console.error('Error in generateInsightsAction:', error);
        return { error: 'Failed to generate insights. Please try again later.' };
    }
}

export async function createFinancialPlanAction(
    input: CreateFinancialPlanInput
): Promise<FinancialPlanResult> {
    try {
        const result = await createFinancialPlan(input);
        return result;
    } catch (error) {
        console.error('Error in createFinancialPlanAction:', error);
        return { error: 'Failed to generate financial plan. Please try again later.' };
    }
}

export async function createMonthlyBudgetsAction(
    input: CreateMonthlyBudgetsInput
): Promise<MonthlyBudgetsResult> {
    try {
        const result = await createMonthlyBudgets(input);
        return result;
    } catch (error) {
        console.error('Error in createMonthlyBudgetsAction:', error);
        return { error: 'Failed to generate budgets. Please try again later.' };
    }
}

export async function assistantAction(
    input: AssistantActionInput
): Promise<AssistantResult> {
    try {
        const result = await assistantActionFlow(input);
        return result;
    } catch (error) {
        console.error('Error in assistantAction:', error);
        return { action: 'unknown', reason: 'An unexpected error occurred while processing your command.' };
    }
}

export async function analyzeTaxesAction(
    input: AnalyzeTaxesInput
): Promise<TaxAnalysisResult> {
    try {
        const result = await analyzeTaxes(input);
        return result;
    } catch (error) {
        console.error('Error in analyzeTaxesAction:', error);
        return { error: 'Failed to analyze taxes. Please try again later.' };
    }
}

export async function createSavingsGoalAction(
    input: CreateSavingsGoalInput
): Promise<SavingsGoalResult> {
    try {
        const result = await createSavingsGoal(input);
        return result;
    } catch (error) {
        console.error('Error in createSavingsGoalAction:', error);
        return { error: 'Failed to generate savings goal. Please try again later.' };
    }
}

export async function createChecklistAction(
    input: CreateChecklistInput
): Promise<ChecklistResult> {
    try {
        const result = await createChecklist(input);
        return result;
    } catch (error) {
        console.error('Error in createChecklistAction:', error);
        return { error: 'Failed to generate checklist from your text. Please try again.' };
    }
}

export async function parseBankStatementAction(
    input: z.infer<typeof ParseBankStatementInputSchema>
): Promise<BankStatementParseResult> {
    if (!input.fileDataUri) {
        return { error: 'Please provide a bank statement file.' };
    }
    
    try {
        // Pass schemas to the flow, so it doesn't need to define/export them.
        const result = await parseBankStatementFlow({
            fileDataUri: input.fileDataUri,
            schema: ParseBankStatementInputSchema,
            outputSchema: ParseBankStatementOutputSchema
        } as any);
        return result;
    } catch (error) {
        logger.error('Error in parseBankStatementAction:', error as Error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse bank statement. The document may be too complex or in an unsupported format.';
        return { error: errorMessage };
    }
}
