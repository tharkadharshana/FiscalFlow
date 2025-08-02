
'use server';
/**
 * @fileOverview A lightweight AI flow to calculate taxes for a single transaction item.
 */

import { ai } from '@/ai/genkit';
import { CalculateItemTaxInputSchema, TaxDetailsSchema } from '@/types/schemas';
import type { CalculateItemTaxInput, TaxDetails } from '@/types/schemas';

export async function calculateItemTax(input: CalculateItemTaxInput): Promise<TaxDetails> {
  return calculateItemTaxFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateItemTaxPrompt',
  input: { schema: CalculateItemTaxInputSchema },
  output: { schema: TaxDetailsSchema },
  prompt: `You are an expert Sri Lankan tax calculation engine. Your task is to calculate the detailed tax breakdown for a single item based on a given set of tax rules.

  **Item to Analyze:**
  - Description: "{{description}}"
  - Price: {{price}}

  **Tax Rules to Apply (Country: {{countryCode}}):**
  {{{taxRules}}}

  **Instructions:**
  1.  **Determine Origin**: Based on the item's description, determine if it is "Imported" or "Local".
  2.  **Calculate Tariff**: If the item is Imported, find the appropriate tariff rate from the tax rules based on its likely category and apply it to the item's price. If Local, tariff is 0.
  3.  **Calculate Excise Duty**: If the item falls into a category with specific excise duties (like fuel), calculate it. Otherwise, excise is 0.
  4.  **Calculate Other Taxes**: Calculate any other applicable levies like PAL or SSL based on the rules.
  5.  **Calculate VAT**: Apply the VAT rate to the appropriate base (Price + Tariff + Other Taxes).
  6.  **Calculate Total Tax**: Sum up all calculated taxes.
  7.  **Calculate Shop Fee**: Subtract the Total Tax from the initial Price. If the result is negative, the shop fee is 0.
  8.  **Return Structured Output**: Format your entire response as a single JSON object that strictly adheres to the 'TaxDetails' schema.

  Provide the final JSON object now.
  `,
});

const calculateItemTaxFlow = ai.defineFlow(
  {
    name: 'calculateItemTaxFlow',
    inputSchema: CalculateItemTaxInputSchema,
    outputSchema: TaxDetailsSchema,
  },
  async (input) => {
    // Sanitize the taxRules object for the prompt
    const cleanTaxRules = JSON.stringify(input.taxRules, null, 2);
    
    const { output } = await prompt({ ...input, taxRules: cleanTaxRules });
    return output!;
  }
);
