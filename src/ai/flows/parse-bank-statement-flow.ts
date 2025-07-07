'use server';
/**
 * @fileOverview An AI flow to parse financial transactions from a bank statement document.
 *
 * - parseBankStatement - A function that handles parsing a bank statement.
 * - ParseBankStatementInput - The input type for the parseBankStatement function.
 * - ParseBankStatementOutput - The return type for the parseBankStatement function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { defaultCategories } from '@/data/mock-data';

const ParsedTransactionSchema = z.object({
    date: z.string().describe('The transaction date in YYYY-MM-DD format. If no year is present, assume the current year.'),
    description: z.string().describe('The full transaction description from the statement.'),
    amount: z.number().describe('The transaction amount. Use negative numbers for debits/expenses and positive for credits/income.'),
    category: z.string().describe(`A suggested category for this transaction. Must be one of the following: ${defaultCategories.join(', ')}`),
});

export const ParseBankStatementOutputSchema = z.object({
  transactions: z.array(ParsedTransactionSchema),
});
export type ParseBankStatementOutput = z.infer<typeof ParseBankStatementOutputSchema>;

export const ParseBankStatementInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A bank statement file (like a PDF), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseBankStatementInput = z.infer<typeof ParseBankStatementInputSchema>;

export async function parseBankStatement(input: ParseBankStatementInput): Promise<ParseBankStatementOutput> {
  return parseBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseBankStatementPrompt',
  input: {schema: ParseBankStatementInputSchema},
  output: {schema: ParseBankStatementOutputSchema},
  prompt: `You are an expert financial data extraction AI. Analyze the bank statement provided and extract all transactions.

  **Instructions:**
  1.  Iterate through every line item in the statement.
  2.  For each transaction, extract the date, description, and amount.
  3.  Determine the transaction type. Debits, withdrawals, or payments are expenses and should have their amount represented as a negative number. Credits, deposits, or payments received are income and should have their amount as a positive number.
  4.  Based on the description, assign a relevant category from the provided list.
  5.  Format the date as YYYY-MM-DD.
  6.  Compile all extracted transactions into a JSON array that strictly adheres to the 'ParseBankStatementOutput' schema.

  Bank Statement File: {{media url=fileDataUri}}`,
});

const parseBankStatementFlow = ai.defineFlow(
  {
    name: 'parseBankStatementFlow',
    inputSchema: ParseBankStatementInputSchema,
    outputSchema: ParseBankStatementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
