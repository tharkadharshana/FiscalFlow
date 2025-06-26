// src/lib/actions.ts
'use server';

import {
  categorizeTransaction,
  type CategorizeTransactionInput,
  type CategorizeTransactionOutput,
} from '@/ai/flows/categorize-transaction';

type SuggestionResult = CategorizeTransactionOutput | { error: string };

export async function getCategorySuggestion(
  input: CategorizeTransactionInput
): Promise<SuggestionResult> {
  if (!input.ocrText || input.ocrText.trim().length < 10) {
    return { error: 'Please provide more text from the receipt.' };
  }
  
  try {
    const result = await categorizeTransaction(input);
    return result;
  } catch (error) {
    console.error('Error in getCategorySuggestion:', error);
    return { error: 'Failed to analyze receipt. Please try again.' };
  }
}
