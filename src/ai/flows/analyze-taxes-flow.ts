
'use server';
/**
 * @fileOverview A generic AI flow to analyze transactions and identify tax liabilities for any country.
 *
 * - analyzeTaxes - A function that handles the tax analysis process.
 */

import { ai } from '@/ai/genkit';
import { AnalyzeTaxesInputSchema, AnalyzeTaxesOutputSchema } from '@/types/schemas';
import type { AnalyzeTaxesInput, AnalyzeTaxesOutput } from '@/types/schemas';

// Main Flow Definition
export async function analyzeTaxes(
  input: AnalyzeTaxesInput
): Promise<AnalyzeTaxesOutput> {
  
  const taxAnalysisPrompt = ai.definePrompt({
      name: 'taxAnalysisPrompt',
      input: { schema: AnalyzeTaxesInputSchema },
      output: { schema: AnalyzeTaxesOutputSchema },
      system: `You are an expert global financial analyst specializing in tax law. Your task is to analyze a user's complete financial picture for the specified country ({{countryCode}}) and identify all potential tax liabilities.

      **Core Instructions:**
      1.  **Analyze All Data Sources:** You will be given transactions, investments, and savings goals. You must consider all of them.
      2.  **Calculate Liabilities:**
          -   **Income Tax (e.g., PAYE):** Sum all 'income' type transactions to get the gross annual income. Based on the tax laws for {{countryCode}}, calculate the personal income tax liability.
          -   **Consumption Tax (e.g., VAT/GST):** For each 'expense' transaction, determine if it is subject to VAT/GST in {{countryCode}}. Calculate the tax paid on applicable items and sum them for a total.
          -   **Capital Gains Tax:** Review the list of investments. While you don't know if they were sold, mention a potential capital gains tax liability if the country has one. You DO NOT need to calculate an amount, but you should create a liability item with amount 0 and a description explaining it.
          -   **Interest Income Tax:** Review the list of savings goals. If the country taxes interest on savings, calculate a potential tax based on the saved amount. Assume a conservative interest rate (e.g., 2%) if not specified.
          -   **Other Taxes:** Identify any other relevant taxes based on all the provided data and country context.
      3.  **Perform Calculations:** You are responsible for the calculations. Do not use placeholder text (except for Capital Gains). You must return a final, calculated number for the 'amount' field in each liability.
      4.  **Prioritize User Document:** If the user provides custom tax documentation in the 'taxDocument' field, you MUST prioritize it over your internal knowledge. Your 'description' for the liability should mention that you are using the custom rules provided.
      5.  **Return Structured Output:** Format your entire response as a single JSON object that strictly adheres to the 'AnalyzeTaxesOutput' schema. If no liabilities are found, return an empty 'liabilities' array.

      {{#if taxDocument}}
      **User-Provided Tax Documentation (Highest Priority Source of Truth):**
      ---
      {{{taxDocument}}}
      ---
      {{/if}}
      `,
  });


  const analyzeTaxesFlow = ai.defineFlow(
    {
      name: 'analyzeTaxesFlow',
      inputSchema: AnalyzeTaxesInputSchema,
      outputSchema: AnalyzeTaxesOutputSchema,
    },
    async (flowInput) => {
      
      const llmResponse = await taxAnalysisPrompt(flowInput);
      
      // The structured output is now fully reliant on the LLM.
      // The Zod schema validation on the prompt output will ensure the structure is correct.
      // If the LLM fails to produce a valid output, Genkit will throw an error which is caught by the server action.
      return llmResponse.output!;
    }
  );

  return analyzeTaxesFlow(input);
}
