
'use server';
/**
 * @fileOverview An AI flow to create a structured financial plan from a user's natural language description.
 *
 * - createFinancialPlan - A function that handles creating or updating a financial plan.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// --- Financial Plan Schemas (Moved from actions.ts) ---
const PlanItemSchema = z.object({
  id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
  description: z.string().describe('A clear description of the expense item.'),
  category: z.string().describe('A suitable category for the item (e.g., Flights, Food, Fees).'),
  predictedCost: z.number().describe('The estimated cost for this item.'),
  isAiSuggested: z.boolean().optional().describe('Set to true if this item was suggested by the AI, not the user.'),
});
export const CreateFinancialPlanOutputSchema = z.object({
  title: z.string().describe('A concise title for the financial plan (e.g., "Paris Trip 2024").'),
  items: z.array(PlanItemSchema).describe('A list of all plan items, both from the user and suggested by the AI.'),
});
export const CreateFinancialPlanInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their goal or what to add to the plan."),
  existingPlan: CreateFinancialPlanOutputSchema.optional().describe("The existing plan if the user is adding to it.")
});
export type CreateFinancialPlanOutput = z.infer<typeof CreateFinancialPlanOutputSchema>;
export type CreateFinancialPlanInput = z.infer<typeof CreateFinancialPlanInputSchema>;


export async function createFinancialPlan(input: CreateFinancialPlanInput): Promise<CreateFinancialPlanOutput> {
  
  const prompt = ai.definePrompt({
    name: 'createFinancialPlanPrompt',
    input: {schema: CreateFinancialPlanInputSchema},
    output: {schema: CreateFinancialPlanOutputSchema},
    prompt: `You are an expert financial planner. A user will provide a description of a financial goal (like a trip or savings plan) and optionally an existing plan to modify.
  Your task is to act as a helpful assistant and generate a structured financial plan as a JSON object.

  Follow these rules:
  1.  **Parse the Goal:** Analyze the user's query to understand their primary objective.
  2.  **Create a Title:** Generate a clear, concise title for the plan (e.g., "Summer Vacation to Italy", "New Car Savings Goal"). If modifying an existing plan, keep the original title unless the query implies a major change.
  3.  **Itemize Expenses:** Break down the user's description into specific, actionable line items. Each item must have a unique 'id', a 'description', a 'category', and a 'predictedCost'.
  4.  **Suggest Additions (AI Power):** Based on the user's goal, intelligently suggest 2-3 additional items they might have forgotten. For a vacation, you might suggest 'Travel Insurance', 'Souvenirs', or an 'Emergency Fund'. For a car, 'Registration Fees' or 'Initial Insurance Payment'. For each AI-suggested item, set the 'isAiSuggested' flag to true.
  5.  **Integrate Existing Plan:** If an 'existingPlan' is provided, merge the new requests into it. Do not duplicate items. If the user asks to remove something, remove it.
  6.  **Be Conservative:** If a user is vague about a cost, provide a reasonable, well-researched estimate, but try to use numbers they provide.

  **User's Request:**
  "{{userQuery}}"

  {{#if existingPlan}}
  **Existing Plan to Modify:**
  Title: {{existingPlan.title}}
  Items:
  {{#each existingPlan.items}}
  - {{this.description}} (Predicted Cost: \${{this.predictedCost}})
  {{/each}}
  {{/if}}

  Now, generate the complete, updated financial plan based on the user's request.
  `,
  });

  const createFinancialPlanFlow = ai.defineFlow(
    {
      name: 'createFinancialPlanFlow',
      inputSchema: CreateFinancialPlanInputSchema,
      outputSchema: CreateFinancialPlanOutputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);
      return output!;
    }
  );

  return createFinancialPlanFlow(input);
}
