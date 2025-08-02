
'use server';
/**
 * @fileOverview An AI flow to analyze transactions and identify tax liabilities based on user-defined rules.
 *
 * - analyzeTaxes - A function that handles the tax analysis process.
 */

import { ai } from '@/ai/genkit';
import { AnalyzeTaxesInputSchema, AnalyzeTaxesOutputSchema } from '@/types/schemas';
import type { AnalyzeTaxesInput, AnalyzeTaxesOutput } from '@/types/schemas';
import { z } from 'zod';

// Main Flow Definition
export async function analyzeTaxes(
  input: AnalyzeTaxesInput
): Promise<AnalyzeTaxesOutput> {
  
  const taxAnalysisPrompt = ai.definePrompt({
      name: 'taxAnalysisPrompt',
      input: { schema: z.object({
          transactionsJson: z.string(),
          taxRulesJson: z.string(),
          countryCode: z.string(),
      }) },
      output: { schema: AnalyzeTaxesOutputSchema },
      prompt: `You are an expert global financial analyst specializing in tax law for country code {{countryCode}}. Your task is to analyze a user's transactions and identify the item-wise tax breakdown for each expense based ONLY on the provided tax rules.

      **Core Instructions:**
      1.  **Analyze Only Expenses:** You will be given a list of transactions. You MUST only analyze transactions where \`type\` is 'expense'. Ignore all 'income' transactions.
      2.  **Apply Tax Rules:** For each expense transaction, use the provided tax rules JSON to calculate the detailed tax breakdown for its items.
          - Your primary source of truth is the 'taxRulesJson' object. Do not use any external knowledge.
          - For each item in a transaction, calculate the 'tariff', 'vat', 'excise', and 'other' taxes.
          - Sum these to get the 'totalTax'.
          - Calculate the 'shopFee' by subtracting 'totalTax' from the item's original 'amount'.
      3.  **Return Full Transaction List:** You must return ALL original transactions provided in the input, but with the 'isTaxAnalyzed' flag set to true and the 'taxDetails' object populated for each item within an *expense* transaction. Income transactions should be returned as-is with 'isTaxAnalyzed: true'.

      **Tax Rules (Source of Truth):**
      ---
      {{{taxRulesJson}}}
      ---

      **Transactions to Analyze:**
      ---
      {{{transactionsJson}}}
      ---
      `,
  });


  const analyzeTaxesFlow = ai.defineFlow(
    {
      name: 'analyzeTaxesFlow',
      inputSchema: AnalyzeTaxesInputSchema,
      outputSchema: AnalyzeTaxesOutputSchema,
    },
    async (flowInput) => {
        const transactionsJson = JSON.stringify(flowInput.transactions, null, 2);
        const taxRulesJson = JSON.stringify(flowInput.taxRules, null, 2);

        const llmResponse = await taxAnalysisPrompt({
            transactionsJson,
            taxRulesJson,
            countryCode: flowInput.countryCode,
        });
      
        if (!llmResponse.output?.analyzedTransactions) {
            console.error("AI did not return analyzedTransactions. Fallback required.");
            // To prevent crashes, we'll mark the original transactions as analyzed without tax details.
            return { 
                analyzedTransactions: flowInput.transactions.map(t => ({ ...t, isTaxAnalyzed: true }))
            };
        }
        
        return llmResponse.output;
    }
  );

  return analyzeTaxesFlow(input);
}
