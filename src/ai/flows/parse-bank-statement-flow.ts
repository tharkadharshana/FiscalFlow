
'use server';
/**
 * @fileOverview An AI flow to parse financial transactions from a bank statement document.
 *
 * - parseBankStatement - A function that handles parsing a bank statement.
 */

import { ai } from '@/ai/genkit';
import { ParseBankStatementInputSchema, ParseBankStatementOutputSchema } from '@/types/schemas';
import type { ParseBankStatementInput, ParseBankStatementOutput } from '@/types/schemas';

export async function parseBankStatement(input: ParseBankStatementInput): Promise<ParseBankStatementOutput> {
  const prompt = ai.definePrompt({
    name: 'parseBankStatementPrompt',
    input: { schema: ParseBankStatementInputSchema },
    output: { schema: ParseBankStatementOutputSchema },
    prompt: `You are an expert financial data extraction AI. Analyze the bank statement provided and extract all transactions.

    **Instructions:**
    1.  Iterate through every line item in the statement.
    2.  For each transaction, extract the date, description, and amount.
    3.  Determine the transaction type. Debits, withdrawals, or payments are expenses and should have their amount represented as a negative number. Credits, deposits, or payments received are income and should have their amount as a positive number.
    4.  Based on the description, assign a relevant category. Your available categories are: {{defaultCategories.join(', ')}}.
    5.  Format the date as YYYY-MM-DD.
    6.  Compile all extracted transactions into a JSON array that strictly adheres to the 'ParseBankStatementOutput' schema.

    Bank Statement File: {{media url=fileDataUri}}`,
  });

  const { output } = await prompt(input);
  return output!;
}
