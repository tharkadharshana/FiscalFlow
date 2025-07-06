
'use server';
/**
 * @fileOverview An AI flow to create a structured checklist from a user's natural language description.
 *
 * - createChecklist - A function that handles creating or updating a checklist.
 * - CreateChecklistInput - The input type for the createChecklist function.
 * - CreateChecklistOutput - The return type for the createChecklist function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { nanoid } from 'nanoid';

const ChecklistItemSchema = z.object({
    id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
    description: z.string().describe('A clear description of the checklist item (e.g., a product to buy or a task to do).'),
    predictedCost: z.number().optional().describe('The estimated cost for this item, if mentioned by the user.'),
  });
  
const CreateChecklistOutputSchema = z.object({
  title: z.string().describe('A concise title for the checklist (e.g., "Weekly Groceries", "Vacation Packing List").'),
  items: z.array(ChecklistItemSchema).describe('A list of all checklist items generated from the user query.'),
});
export type CreateChecklistOutput = z.infer<typeof CreateChecklistOutputSchema>;

const CreateChecklistInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their checklist."),
});
export type CreateChecklistInput = z.infer<typeof CreateChecklistInputSchema>;


export async function createChecklist(input: CreateChecklistInput): Promise<CreateChecklistOutput> {
  return createChecklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createChecklistPrompt',
  input: {schema: CreateChecklistInputSchema},
  output: {schema: CreateChecklistOutputSchema},
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
    inputSchema: CreateChecklistInputSchema,
    outputSchema: CreateChecklistOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

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
