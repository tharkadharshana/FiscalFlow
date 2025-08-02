
'use server';
/**
 * @fileOverview A sophisticated AI flow to analyze transactions and calculate a detailed, item-wise tax breakdown.
 *
 * - analyzeTaxes - A function that handles the detailed tax analysis process for Sri Lanka.
 */

import { ai } from '@/ai/genkit';
import { AnalyzeTaxesInputSchema, AnalyzeTaxesOutputSchema } from '@/types/schemas';
import type { AnalyzeTaxesInput, AnalyzeTaxesOutput, TransactionItem } from '@/types/schemas';

// Main Flow Definition
export async function analyzeTaxes(
  input: AnalyzeTaxesInput
): Promise<AnalyzeTaxesOutput> {
  
  const taxAnalysisPrompt = ai.definePrompt({
      name: 'taxAnalysisPrompt',
      input: { schema: AnalyzeTaxesInputSchema },
      output: { schema: AnalyzeTaxesOutputSchema },
      system: `You are an expert financial analyst specializing in Sri Lankan (countryCode: LK) tax law.
      Your task is to analyze a list of transactions and calculate a detailed, item-wise tax breakdown for each expense.

      **Core Instructions:**

      1.  **Iterate Through Transactions:** Process each transaction in the input array. If a transaction is an 'income' type, or if it has no 'items', return it unchanged but with 'isTaxAnalyzed' set to true.

      2.  **Analyze Each Item:** For each item within an expense transaction's 'items' array:
          a. **Determine Origin:** Based on the item's description (e.g., "Samsung TV", "Local Rice"), determine if it is 'Imported' or 'Local'. If unsure, default to 'Local'.
          b. **Apply Tax Logic (LK):**
              - **VAT (Value Added Tax):** Assume a standard rate of 18% on the base price (Shop Fee).
              - **Tariff (Customs Duty):** If the item is 'Imported', apply a category-specific tariff. Use these estimates: Electronics (10%), Clothing (25%), Vehicles (100%), Other (15%). If 'Local', the tariff is 0.
              - **Excise Duty:** If the category is 'Fuel', apply a 20% excise duty on the base price. For all other categories, this is 0.
              - **Shop Fee Calculation:** The total price of the item is the sum of Shop Fee + VAT + Tariff + Excise. You must reverse-calculate the 'shopFee'. The formula is: Shop Fee = Item Price / (1 + VAT Rate + Tariff Rate + Excise Rate).
          c. **Special Logic for Transport/Rideshare:**
              - If an item description contains 'Uber', 'PickMe', or similar, and the transaction 'notes' field contains a distance (e.g., "15km trip"), use this logic:
              - Assume: Fuel Price = 370 LKR/litre, Avg. Consumption = 12 km/litre.
              - Fuel Cost = (Distance / Avg. Consumption) * Fuel Price.
              - The fuel cost itself is subject to taxes. Break it down: Base Fuel = Fuel Cost / 1.20; Fuel Excise = Base Fuel * 0.20.
              - The company's fee is the remaining amount: Ride Company Fee = Item Price - Fuel Cost.
              - For this item, set: shopFee = Ride Company Fee, tariff = 0, vat = 0, otherTaxes = Fuel Excise.
          d. **Populate 'taxDetails':** For each item, you MUST calculate and populate the 'taxDetails' object with the calculated 'tariff', 'vat', 'otherTaxes' (for excise), and 'shopFee'. Set 'isAnalyzed' to true.

      3.  **Return Full Transaction Objects:** Your final output must be an array containing ALL the original transactions, with the expense items updated with the new 'taxDetails' and the top-level 'isTaxAnalyzed' flag set to true for every transaction you processed.
      `,
  });


  const analyzeTaxesFlow = ai.defineFlow(
    {
      name: 'analyzeTaxesFlow',
      inputSchema: AnalyzeTaxesInputSchema,
      outputSchema: AnalyzeTaxesOutputSchema,
    },
    async (flowInput) => {
      
      // If there are no transactions to analyze, return an empty array.
      if (!flowInput.transactions || flowInput.transactions.length === 0) {
        return { analyzedTransactions: [] };
      }

      const llmResponse = await taxAnalysisPrompt(flowInput);
      
      const output = llmResponse.output;

      if (!output || !output.analyzedTransactions) {
        throw new Error("AI failed to return the expected 'analyzedTransactions' array.");
      }

      // Final validation to ensure all transactions are marked as analyzed.
      // The AI should do this, but this is a safeguard.
      output.analyzedTransactions.forEach(tx => {
        tx.isTaxAnalyzed = true;
        tx.items?.forEach(item => {
            if (item.taxDetails) {
                item.taxDetails.isAnalyzed = true;
            }
        })
      });
      
      return output;
    }
  );

  return analyzeTaxesFlow(input);
}
