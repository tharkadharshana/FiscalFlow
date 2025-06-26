// src/ai/flows/categorize-transaction.ts
'use server';

/**
 * @fileOverview A flow to categorize transactions based on OCR scanned receipt data.
 *
 * - categorizeTransaction - A function that handles the transaction categorization process.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  ocrText: z
    .string()
    .describe('The OCR extracted text from the receipt or bill.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  suggestedCategory: z
    .string()
    .describe('The AI suggested category for the transaction.'),
  confidence: z
    .number()
    .describe(
      'A number between 0 and 1 indicating the confidence level in the suggested category.'
    ),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(
  input: CategorizeTransactionInput
): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `You are an AI assistant specializing in categorizing financial transactions.

  Based on the following OCR text extracted from a receipt, suggest a category for the transaction and express the confidence level in your suggestion.

  OCR Text: {{{ocrText}}}

  Provide the output in JSON format.
  `,
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
