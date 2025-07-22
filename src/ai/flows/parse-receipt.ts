
'use server';
/**
 * @fileOverview An AI flow to parse receipts using OCR.
 *
 * - parseReceipt - A function that handles parsing a receipt image.
 */

import {ai} from '@/ai/genkit';
import { ParseReceiptInputSchema, ParseReceiptOutputSchema } from '@/types/schemas';
import type { ParseReceiptInput, ParseReceiptOutput } from '@/types/schemas';

export async function parseReceipt(input: ParseReceiptInput): Promise<ParseReceiptOutput> {
  return parseReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseReceiptPrompt',
  input: {schema: ParseReceiptInputSchema},
  output: {schema: ParseReceiptOutputSchema},
  prompt: `You are an expert receipt processing AI. Analyze the receipt image provided and extract the following information in a structured JSON format.

If you cannot find a piece of information, omit the field from the JSON output. The date should be in YYYY-MM-DD format. The total amount should be a number. The line items should be an array of objects.
Do your best to categorize the transaction based on the store and items.

Receipt Image: {{media url=photoDataUri}}`,
});

const parseReceiptFlow = ai.defineFlow(
  {
    name: 'parseReceiptFlow',
    inputSchema: ParseReceiptInputSchema,
    outputSchema: ParseReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
