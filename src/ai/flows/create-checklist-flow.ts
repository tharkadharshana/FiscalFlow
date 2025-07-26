'use server';
/**
 * @fileOverview An AI flow to create a structured checklist from a user's natural language description.
 *
 * - createChecklist - A function that handles creating a structured checklist.
 */

import {ai} from '@/ai/genkit';
import { CreateChecklistInputSchema, CreateChecklistOutputSchema } from '@/types/schemas';
import type { CreateChecklistInput, CreateChecklistOutput } from '@/types/schemas';
import { allIcons } from '@/data/icons';


export async function createChecklist(input: CreateChecklistInput): Promise<CreateChecklistOutput> {
  
  const prompt = ai.definePrompt({
    name: 'createChecklistPrompt',
    input: {schema: CreateChecklistInputSchema},
    output: {schema: CreateChecklistOutputSchema},
    prompt: `You are an expert at creating actionable financial checklists. A user will provide a natural language description of what they need to buy or pay for.

Your task is to parse their request and generate a structured checklist object in JSON format.

Follow these rules:
1.  **Parse the Goal:** Analyze the user's query to understand their main objective (e.g., grocery shopping, paying monthly bills, getting car maintenance).
2.  **Create a Title:** Generate a clear, concise title for the checklist.
3.  **Select an Icon:** Choose the most appropriate icon name from the available list that matches the checklist's theme.
4.  **Itemize:** Break down the user's description into specific, actionable line items. Each item must have:
    - A unique 'id'.
    - A 'description'.
    - A 'predictedCost' (estimate if not provided).
    - An appropriate 'category' from the list of expense categories.
5.  **Handle Ambiguity:** If the user is vague, make reasonable assumptions. For "car checkup," you might include items like 'Oil Change' and 'Tire Rotation'.

**Available Icons:**
{{#each availableIcons}}
- {{this}}
{{/each}}

**Available Expense Categories:**
{{#each availableCategories}}
- {{this}}
{{/each}}


**User's Request:**
"{{userQuery}}"

Now, generate the complete checklist object.
`,
  });

  const createChecklistFlow = ai.defineFlow(
    {
      name: 'createChecklistFlow',
      inputSchema: CreateChecklistInputSchema,
      outputSchema: CreateChecklistOutputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);
      return output!;
    }
  );

  return createChecklistFlow({
      ...input,
      availableIcons: Object.keys(allIcons),
  });
}
