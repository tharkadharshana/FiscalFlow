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


type SuggestionResult = ParseReceiptOutput | { error: string };
type InsightsResult = GenerateInsightsOutput | { error: string };
type FinancialPlanResult = CreateFinancialPlanOutput | { error: string };
type MonthlyBudgetsResult = CreateMonthlyBudgetsOutput | { error: string };
type AssistantResult = VoiceAction | { error: string };
type TaxAnalysisResult = AnalyzeTaxesOutput | { error: string };


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
    return { error: 'Failed to analyze receipt. Please try again.' };
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
