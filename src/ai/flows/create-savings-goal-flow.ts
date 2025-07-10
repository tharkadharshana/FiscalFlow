
'use server';
/**
 * @fileOverview An AI flow to create a structured savings goal from a user's natural language description.
 *
 * - createSavingsGoal - A function that handles creating a savings goal.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { CreateSavingsGoalInputSchema, CreateSavingsGoalOutputSchema } from '@/lib/actions';


export async function createSavingsGoal(input: z.infer<typeof CreateSavingsGoalInputSchema>): Promise<z.infer<typeof CreateSavingsGoalOutputSchema>> {
  
  const prompt = ai.definePrompt({
    name: 'createSavingsGoalPrompt',
    input: {schema: input.schema},
    output: {schema: input.outputSchema},
    prompt: `You are an expert financial assistant. A user will provide a description of a savings goal.
  Your task is to parse their request and extract the key details into a structured JSON object.

  Follow these rules:
  1.  **Parse the Goal:** Analyze the user's query to understand their primary objective.
  2.  **Extract Title:** Generate a clear, concise title for the goal.
  3.  **Extract Target Amount:** Identify the total monetary amount the user wants to save.
  4.  **Extract Deadline:** If the user mentions a specific date, holiday, or time frame (e.g., "by Christmas", "in 6 months", "by June 2025"), calculate and format it as YYYY-MM-DD. If no year is specified, assume the nearest future date. For example, if it's currently August and the user says "by December", assume this coming December. If it is January and user says "by December", assume this year's December.

  **User's Request:**
  "{{userQuery}}"

  Now, generate the structured savings goal object.
  `,
  });

  const createSavingsGoalFlow = ai.defineFlow(
    {
      name: 'createSavingsGoalFlow',
      inputSchema: input.schema,
      outputSchema: input.outputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);
      return output!;
    }
  );
  
  return createSavingsGoalFlow(input.payload);
}
