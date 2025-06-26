// src/lib/actions.ts
'use server';

import {
  parseReceipt,
  type ParseReceiptInput,
  type ParseReceiptOutput,
} from '@/ai/flows/parse-receipt';

type SuggestionResult = ParseReceiptOutput | { error: string };

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
