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


type SuggestionResult = ParseReceiptOutput | { error: string };
type InsightsResult = GenerateInsightsOutput | { error: string };
type FinancialPlanResult = CreateFinancialPlanOutput | { error: string };


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
