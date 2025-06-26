'use server';
/**
 * @fileOverview An AI flow to create multiple monthly budget allocations from a user's natural language description.
 *
 * - createMonthlyBudgets - A function that handles creating structured budget data.
 * - CreateMonthlyBudgetsInput - The input type for the createMonthlyBudgets function.
 * - CreateMonthlyBudgetsOutput - The return type for the createMonthlyBudgets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BudgetSchema = z.object({
  category: z.string().describe('A suitable category for the budget (e.g., Groceries, Food, Entertainment).'),
  limit: z.number().describe('The budget limit for this category.'),
});
  
const CreateMonthlyBudgetsOutputSchema = z.object({
  budgets: z.array(BudgetSchema).describe('A list of budget items generated from the user query.'),
});
export type CreateMonthlyBudgetsOutput = z.infer<typeof CreateMonthlyBudgetsOutputSchema>;

const CreateMonthlyBudgetsInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their monthly budget goals."),
  existingCategories: z.array(z.string()).describe("A list of budget categories that already exist to avoid duplication.")
});
export type CreateMonthlyBudgetsInput = z.infer<typeof CreateMonthlyBudgetsInputSchema>;


export async function createMonthlyBudgets(input: CreateMonthlyBudgetsInput): Promise<CreateMonthlyBudgetsOutput> {
  return createMonthlyBudgetsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createMonthlyBudgetsPrompt',
  input: {schema: CreateMonthlyBudgetsInputSchema},
  output: {schema: CreateMonthlyBudgetsOutputSchema},
  prompt: `You are an expert financial planner specializing in monthly budgets. A user will provide a natural language description of their desired budgets for the month.

Your task is to parse their request and generate a structured list of budget objects.

Follow these rules:
1.  **Parse the Query:** Analyze the user's query to identify all requested budget categories and their specified limits.
2.  **Handle Multiple Requests:** The user might specify several budgets in a single sentence (e.g., "Budget $500 for groceries, $100 for gas, and $250 for entertainment."). Create a separate budget object for each.
3.  **Suggest Sensible Limits:** If the user asks for a "reasonable" or "average" budget for a category without specifying an amount, provide a sensible, common-sense limit. For example, a "reasonable" entertainment budget might be $150.
4.  **Categorize Correctly:** Use standard, clear category names like "Groceries", "Food", "Transport", "Entertainment", "Utilities", etc.
5.  **Avoid Duplicates:** The user has provided a list of categories that already have budgets. Do NOT generate budgets for these existing categories. Ignore any part of the query that mentions them.

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


Now, generate the list of new budget items based on the user's request.
`,
});

const createMonthlyBudgetsFlow = ai.defineFlow(
  {
    name: 'createMonthlyBudgetsFlow',
    inputSchema: CreateMonthlyBudgetsInputSchema,
    outputSchema: CreateMonthlyBudgetsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
