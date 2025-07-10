
'use server';
/**
 * @fileOverview An AI flow to create a structured checklist from a user's natural language description.
 *
 * - createChecklist - A function that handles creating or updating a checklist.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { nanoid } from 'nanoid';
import type { CreateChecklistInputSchema, CreateChecklistOutputSchema } from '@/lib/actions';


export async function createChecklist(input: z.infer<typeof CreateChecklistInputSchema>): Promise<z.infer<typeof CreateChecklistOutputSchema>> {

  const prompt = ai.definePrompt({
    name: 'createChecklistPrompt',
    input: {schema: input.schema},
    output: {schema: input.outputSchema},
    prompt: `You are an expert at creating checklists. A user will provide a description of a list they want to make.
  Your task is to act as a helpful assistant and generate a structured checklist as a JSON object.

  Follow these rules:
  1.  **Parse the Goal:** Analyze the user's query to understand their primary objective.
  2.  **Create a Title:** Generate a clear, concise title for the checklist (e.g., "Monthly Shopping", "Trip Prep").
  3.  **Itemize:** Break down the user's description into specific, actionable line items. Each item must have a unique 'id', a 'description', and a 'predictedCost' if the user mentions a price. If no cost is mentioned, omit the field or set it to 0.

  **User's Request:**
  "{{userQuery}}"

  Now, generate the complete checklist object based on the user's request.
  `,
  });

  const createChecklistFlow = ai.defineFlow(
    {
      name: 'createChecklistFlow',
      inputSchema: input.schema,
      outputSchema: input.outputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);

      // Ensure items have unique IDs if the LLM forgets
      if (output && output.items) {
          output.items.forEach(item => {
              if (!item.id) {
                  item.id = nanoid();
              }
          });
      }

      return output!;
    }
  );
  
  return createChecklistFlow(input.payload);
}
