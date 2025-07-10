
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
import { createFinancialPlan } from '@/ai/flows/create-financial-plan-flow';
import { createMonthlyBudgets } from '@/ai/flows/create-monthly-budgets-flow';
import {
    assistantAction as assistantActionFlow,
    type AssistantActionInput,
    type VoiceAction
} from '@/ai/flows/assistant-flow';
import { analyzeTaxes } from '@/ai/flows/analyze-taxes-flow';
import { createSavingsGoal } from '@/ai/flows/create-savings-goal-flow';
import { createChecklist } from '@/ai/flows/create-checklist-flow';
import { parseBankStatementFlow } from '@/ai/flows/parse-bank-statement-flow';
import { z } from 'genkit';
import { defaultCategories, defaultExpenseCategories } from '@/data/mock-data';


import { logger } from './logger';
import type { CoinGeckoMarketData } from '@/types';


type SuggestionResult = ParseReceiptOutput | { error: string };
type InsightsResult = GenerateInsightsOutput | { error: string };
type FinancialPlanResult = CreateFinancialPlanOutput | { error: string };
type MonthlyBudgetsResult = CreateMonthlyBudgetsOutput | { error: string };
type AssistantResult = VoiceAction | { error: string };
type TaxAnalysisResult = z.infer<typeof AnalyzeTaxesOutputSchema> | { error: string };
type ParseDocumentResult = { text: string } | { error: string };
type SavingsGoalResult = z.infer<typeof CreateSavingsGoalOutputSchema> | { error: string };
type CoinGeckoResult = CoinGeckoMarketData[] | { error: string };
type ChecklistResult = z.infer<typeof CreateChecklistOutputSchema> | { error: string };
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

// --- Tax Analysis Schemas ---
const TransactionSchema = z.object({
    id: z.string(),
    type: z.enum(['income', 'expense']),
    amount: z.number(),
    category: z.string(),
    source: z.string(),
    date: z.string(),
});
const SimplifiedInvestmentSchema = z.object({
    name: z.string(),
    assetType: z.string(),
    marketValue: z.number(),
});
const SimplifiedSavingsGoalSchema = z.object({
    title: z.string(),
    currentAmount: z.number(),
});
const TaxLiabilitySchema = z.object({
    taxType: z.string().describe('The official name of the tax, e.g., "Value Added Tax (VAT)", "Goods and Services Tax (GST)", "PAYE (Income Tax)", "Capital Gains Tax".'),
    description: z.string().describe('A brief, helpful description of how the tax was calculated (e.g., "Calculated on total income based on 2025 brackets.").'),
    amount: z.number().describe('The calculated tax amount. The AI must perform the calculation and return the final number.'),
    sourceTransactionIds: z.array(z.string()).optional().describe('IDs of source transactions, if applicable.'),
});
export const AnalyzeTaxesInputSchema = z.object({
  transactions: z.array(TransactionSchema),
  investments: z.array(SimplifiedInvestmentSchema).optional().describe("A list of the user's current investment holdings."),
  savingsGoals: z.array(SimplifiedSavingsGoalSchema).optional().describe("A list of the user's savings goals, which may generate interest income."),
  countryCode: z.string().describe("The user's country code (e.g., US, LK, GB). This is the primary context for determining tax rules."),
  taxDocument: z.string().optional().describe('User-provided text describing tax rules. This should be treated as the highest priority source of truth.'),
});
export const AnalyzeTaxesOutputSchema = z.object({
    liabilities: z.array(TaxLiabilitySchema),
});
export type AnalyzeTaxesInput = z.infer<typeof AnalyzeTaxesInputSchema>;


// --- Financial Plan Schemas ---
const PlanItemSchema = z.object({
    id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
    description: z.string().describe('A clear description of the expense item.'),
    category: z.string().describe('A suitable category for the item (e.g., Flights, Food, Fees).'),
    predictedCost: z.number().describe('The estimated cost for this item.'),
    isAiSuggested: z.boolean().optional().describe('Set to true if this item was suggested by the AI, not the user.'),
  });
export const CreateFinancialPlanOutputSchema = z.object({
  title: z.string().describe('A concise title for the financial plan (e.g., "Paris Trip 2024").'),
  items: z.array(PlanItemSchema).describe('A list of all plan items, both from the user and suggested by the AI.'),
});
export type CreateFinancialPlanOutput = z.infer<typeof CreateFinancialPlanOutputSchema>;
export const CreateFinancialPlanInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their goal or what to add to the plan."),
  existingPlan: CreateFinancialPlanOutputSchema.optional().describe("The existing plan if the user is adding to it.")
});

// --- Monthly Budgets Schemas ---
const BudgetItemSchema = z.object({
    id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
    description: z.string().describe("The name of the item to purchase."),
    predictedCost: z.number().optional().describe("The estimated cost of this single item, if the user mentions it."),
  });
const BudgetSchema = z.object({
    category: z.string().describe(`A suitable category for the budget. Must be one of: ${defaultExpenseCategories.join(', ')}`),
    limit: z.number().describe('The total budget limit for this category.'),
    items: z.array(BudgetItemSchema).optional().describe("A list of specific items the user mentioned for this budget category."),
  });
export const CreateMonthlyBudgetsOutputSchema = z.object({
  budgets: z.array(BudgetSchema).describe('A list of budget items generated from the user query.'),
});
export type CreateMonthlyBudgetsOutput = z.infer<typeof CreateMonthlyBudgetsOutputSchema>;
export const CreateMonthlyBudgetsInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their monthly budget goals."),
  existingCategories: z.array(z.string()).describe("A list of budget categories that already exist to avoid duplication.")
});

// --- Savings Goal Schemas ---
export const CreateSavingsGoalOutputSchema = z.object({
    title: z.string().describe('A concise title for the savings goal (e.g., "New Gaming Laptop").'),
    targetAmount: z.number().describe('The total amount the user wants to save.'),
    deadline: z.string().optional().describe('The target deadline in YYYY-MM-DD format if mentioned. If no year is mentioned, assume the next upcoming instance of that month/day.'),
  });
export const CreateSavingsGoalInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their savings goal."),
});

// --- Checklist Schemas ---
const ChecklistItemSchema = z.object({
    id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
    description: z.string().describe('A clear description of the checklist item (e.g., a product to buy or a task to do).'),
    predictedCost: z.number().optional().describe('The estimated cost for this item, if mentioned by the user.'),
  });
export const CreateChecklistOutputSchema = z.object({
  title: z.string().describe('A concise title for the checklist (e.g., "Weekly Groceries", "Vacation Packing List").'),
  items: z.array(ChecklistItemSchema).describe('A list of all checklist items generated from the user query.'),
});
export const CreateChecklistInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their checklist."),
});


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
    payload: z.infer<typeof CreateFinancialPlanInputSchema>
): Promise<FinancialPlanResult> {
    try {
        const result = await createFinancialPlan({ schema: CreateFinancialPlanInputSchema, outputSchema: CreateFinancialPlanOutputSchema, payload });
        return result;
    } catch (error) {
        console.error('Error in createFinancialPlanAction:', error);
        return { error: 'Failed to generate financial plan. Please try again later.' };
    }
}

export async function createMonthlyBudgetsAction(
    payload: z.infer<typeof CreateMonthlyBudgetsInputSchema>
): Promise<MonthlyBudgetsResult> {
    try {
        const result = await createMonthlyBudgets({ schema: CreateMonthlyBudgetsInputSchema, outputSchema: CreateMonthlyBudgetsOutputSchema, payload });
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
    payload: AnalyzeTaxesInput
): Promise<TaxAnalysisResult> {
    try {
        const result = await analyzeTaxes({ schema: AnalyzeTaxesInputSchema, outputSchema: AnalyzeTaxesOutputSchema, payload });
        return result;
    } catch (error) {
        console.error('Error in analyzeTaxesAction:', error);
        return { error: 'Failed to analyze taxes. Please try again later.' };
    }
}

export async function createSavingsGoalAction(
    payload: z.infer<typeof CreateSavingsGoalInputSchema>
): Promise<SavingsGoalResult> {
    try {
        const result = await createSavingsGoal({ schema: CreateSavingsGoalInputSchema, outputSchema: CreateSavingsGoalOutputSchema, payload });
        return result;
    } catch (error) {
        console.error('Error in createSavingsGoalAction:', error);
        return { error: 'Failed to generate savings goal. Please try again later.' };
    }
}

export async function createChecklistAction(
    payload: z.infer<typeof CreateChecklistInputSchema>
): Promise<ChecklistResult> {
    try {
        const result = await createChecklist({ schema: CreateChecklistInputSchema, outputSchema: CreateChecklistOutputSchema, payload });
        return result;
    } catch (error) {
        console.error('Error in createChecklistAction:', error);
        return { error: 'Failed to generate checklist from your text. Please try again.' };
    }
}

export async function parseBankStatementAction(
    payload: z.infer<typeof ParseBankStatementInputSchema>
): Promise<BankStatementParseResult> {
    if (!payload.fileDataUri) {
        return { error: 'Please provide a bank statement file.' };
    }
    
    try {
        // Pass schemas to the flow, so it doesn't need to define/export them.
        const result = await parseBankStatementFlow({
            schema: ParseBankStatementInputSchema,
            outputSchema: ParseBankStatementOutputSchema,
            payload
        });
        return result;
    } catch (error) {
        logger.error('Error in parseBankStatementAction:', error as Error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse bank statement. The document may be too complex or in an unsupported format.';
        return { error: errorMessage };
    }
}
