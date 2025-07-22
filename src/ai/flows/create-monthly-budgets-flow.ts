
'use server';
/**
 * @fileOverview An AI flow to create multiple monthly budget allocations from a user's natural language description, including itemized lists.
 *
 * - createMonthlyBudgets - A function that handles creating structured budget data.
 */

import {ai} from '@/ai/genkit';
import { nanoid } from 'nanoid';
import { CreateMonthlyBudgetsInputSchema, CreateMonthlyBudgetsOutputSchema } from '@/types/schemas';
import type { CreateMonthlyBudgetsInput, CreateMonthlyBudgetsOutput } from '@/types/schemas';

export async function createMonthlyBudgets(input: CreateMonthlyBudgetsInput): Promise<CreateMonthlyBudgetsOutput> {
  
  const prompt = ai.definePrompt({
    name: 'createMonthlyBudgetsPrompt',
    input: {schema: CreateMonthlyBudgetsInputSchema},
    output: {schema: CreateMonthlyBudgetsOutputSchema},
    prompt: `You are an expert financial planner specializing in monthly budgets. A user will provide a natural language description of their desired budgets for the month.

  Your task is to parse their request and generate a structured list of budget objects.

  Follow these rules:
  1.  **Parse the Query:** Analyze the user's query to identify all requested budget categories and their specified limits.
  2.  **Itemize:** Within each budget category, identify and list the specific items the user wants to buy. For example, if the query is "Budget $500 for groceries, I need to buy milk, bread, and eggs", you must create a budget for "Groceries" with a limit of 500, and include "milk", "bread", and "eggs" in its 'items' array. Each item needs a unique ID.
  3.  **Handle Multiple Requests:** The user might specify several budgets in a single sentence. Create a separate budget object for each.
  4.  **Suggest Sensible Limits:** If the user asks for a "reasonable" budget without specifying an amount, provide a sensible, common-sense limit.
  5.  **Categorize Correctly:** Use standard, clear category names like "Groceries", "Food", "Transport", "Entertainment", "Utilities", etc.
  6.  **Avoid Duplicates:** The user has provided a list of categories that already have budgets. Do NOT generate budgets for these existing categories. Ignore any part of the query that mentions them.

  **User's Request:**
  "{{userQuery}}"

  **Existing Budget Categories (Do Not Create These):**
  {{#if existingCategories}}
  {{#each existingCategories}}
  - {{this}}
  {{/each}}
  {{else}}
  None
  {{/if}}


  Now, generate the list of new budget items based on the user's request. Ensure every item in the 'items' array has a unique 'id'.
  `,
  });

  const createMonthlyBudgetsFlow = ai.defineFlow(
    {
      name: 'createMonthlyBudgetsFlow',
      inputSchema: CreateMonthlyBudgetsInputSchema,
      outputSchema: CreateMonthlyBudgetsOutputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);
      
      // Ensure items have unique IDs if the LLM forgets
      if (output && output.budgets) {
          output.budgets.forEach(budget => {
              if (budget.items) {
                  budget.items.forEach(item => {
                      if (!item.id) {
                          item.id = nanoid();
                      }
                  });
              }
          });
      }
      
      return output!;
    }
  );

  return createMonthlyBudgetsFlow(input);
}
