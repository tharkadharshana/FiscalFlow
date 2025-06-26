'use server';
/**
 * @fileOverview An AI flow to parse receipts using OCR.
 *
 * - parseReceipt - A function that handles parsing a receipt image.
 * - ParseReceiptInput - The input type for the parseReceipt function.
 * - ParseReceiptOutput - The return type for the parseReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseReceiptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseReceiptInput = z.infer<typeof ParseReceiptInputSchema>;

const ParseReceiptOutputSchema = z.object({
    storeName: z.string().optional().describe('The name of the store or merchant.'),
    transactionDate: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format. If no year is present, assume the current year.'),
    totalAmount: z.number().optional().describe('The final total amount of the transaction.'),
    suggestedCategory: z.string().describe('A suggested category for this transaction like "Food", "Groceries", "Transport", etc.'),
    lineItems: z.array(z.object({ description: z.string(), amount: z.number().optional() })).optional().describe('An array of line items from the receipt.'),
    rawText: z.string().optional().describe('The full raw text extracted from the receipt for debugging.'),
  });
export type ParseReceiptOutput = z.infer<typeof ParseReceiptOutputSchema>;

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
