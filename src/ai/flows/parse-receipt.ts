
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
  prompt: `You are an expert receipt processing AI. Your task is to analyze the provided receipt image and extract as much information as possible into a standardized JSON format.

**Instructions:**
1.  **Read the entire receipt carefully.** Identify all sections: header, line items, and summary.
2.  **Extract Merchant Information:**
    -   Find the 'merchantName'.
    -   Find the 'merchantAddress'.
    -   Find the 'merchantPhone' number.
3.  **Extract Transaction Details:**
    -   Find the 'transactionDate' in YYYY-MM-DD format. If no year is present, assume the current year.
    -   Find the 'transactionTime' in HH:mm format if available.
    -   Find any 'receiptNumber' or 'transactionId'.
4.  **Extract Line Items:**
    -   Create a list of all purchased items. Each item in the 'lineItems' array must have:
        -   'description': The name of the item.
        -   'quantity': The quantity purchased (default to 1 if not specified).
        -   'unitPrice': The price of a single item, if available.
        -   'totalPrice': The final price for that line item.
5.  **Extract Financial Summary:**
    -   Find the 'subtotal' (the total before taxes and discounts).
    -   Find all 'taxes'. For each tax, create an object with its 'description' (e.g., VAT) and 'amount'.
    -   Find all 'discounts'. For each discount, create an object with its 'description' and 'amount'.
    -   Find the final 'totalAmount' paid. This is the most important value.
6.  **Extract Payment and Currency:**
    -   Identify the 'paymentMethod' (e.g., "Cash", "Credit Card", "Visa ****1234").
    -   Identify the 'currency' code (e.g., USD, EUR, GBP).
7.  **Final Output:** Structure all the extracted information into a single JSON object that perfectly matches the 'ParseReceiptOutput' schema. If a field is not present on the receipt, omit it from the JSON. If you cannot find any receipt-like information, return an empty 'bill' object.

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
