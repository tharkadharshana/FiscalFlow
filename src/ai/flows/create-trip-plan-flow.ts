
'use server';
/**
 * @fileOverview An AI flow to create a structured trip plan from a user's natural language description.
 *
 * - createTripPlan - A function that handles creating or updating a trip plan.
 */

import {ai} from '@/ai/genkit';
import { CreateTripPlanInputSchema, CreateTripPlanOutputSchema } from '@/types/schemas';
import type { CreateTripPlanInput, CreateTripPlanOutput } from '@/types/schemas';


export async function createTripPlan(input: CreateTripPlanInput): Promise<CreateTripPlanOutput> {
  
  const prompt = ai.definePrompt({
    name: 'createTripPlanPrompt',
    input: {schema: CreateTripPlanInputSchema},
    output: {schema: CreateTripPlanOutputSchema},
    prompt: `You are an expert financial planner specializing in travel. A user will provide a description of a trip or event and optionally an existing plan to modify.
  Your task is to act as a helpful assistant and generate a structured plan as a JSON object.

  Follow these rules:
  1.  **Parse the Goal:** Analyze the user's query to understand their primary objective.
  2.  **Create a Title:** Generate a clear, concise title for the plan (e.g., "Summer Vacation to Italy", "Weekend Camping Trip"). If modifying an existing plan, keep the original title unless the query implies a major change.
  3.  **Itemize Expenses:** Break down the user's description into specific, actionable line items. Each item must have a unique 'id', a 'description', a 'category', and a 'predictedCost'.
  4.  **Suggest Additions (AI Power):** Based on the user's goal, intelligently suggest 2-3 additional items they might have forgotten. For a vacation, you might suggest 'Travel Insurance', 'Souvenirs', or an 'Emergency Fund'. For each AI-suggested item, set the 'isAiSuggested' flag to true.
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

  Now, generate the complete, updated trip plan based on the user's request.
  `,
  });

  const createTripPlanFlow = ai.defineFlow(
    {
      name: 'createTripPlanFlow',
      inputSchema: CreateTripPlanInputSchema,
      outputSchema: CreateTripPlanOutputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);
      return output!;
    }
  );

  return createTripPlanFlow(input);
}
