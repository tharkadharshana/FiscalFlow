
'use server';
/**
 * @fileOverview An AI flow to parse receipts using OCR, with line item splitting.
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
  prompt: `You are an expert receipt processing AI. Analyze the receipt image provided.

Your primary goal is to identify individual line items and categorize them. If items on the receipt belong to different logical categories (e.g., 'Groceries' and 'Health & Fitness' from a supermarket), you should create separate transactions for each category, grouping the relevant items under them.

**Instructions:**
1.  Read the entire receipt.
2.  Extract the merchant/store name.
3.  Extract the transaction date in YYYY-MM-DD format.
4.  Group all purchased items by a logical category (e.g., 'Groceries', 'Clothing', 'Utilities').
5.  For each category group, create a single transaction object.
6.  Each transaction object must contain:
    - A 'suggestedCategory'.
    - A list of 'lineItems' belonging to that category, each with a 'description' and 'amount'.
    - The 'totalAmount' for that specific transaction (sum of its line items).
7.  If all items belong to one category, you will return a single transaction object in the array.
8.  If you cannot find specific line items, create a single transaction with the total amount and your best guess for the category.

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
