
'use server';
/**
 * @fileOverview An AI flow to act as a voice assistant for the application.
 *
 * - assistantAction - A function that parses a user's voice command and determines the correct action.
 */

import { ai } from '@/ai/genkit';
import { AssistantActionInputSchema, VoiceActionSchema } from '@/types/schemas';
import type { AssistantActionInput, VoiceAction } from '@/types/schemas';

export async function assistantAction(input: AssistantActionInput): Promise<VoiceAction> {
  return assistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assistantPrompt',
  input: { schema: AssistantActionInputSchema },
  output: { schema: VoiceActionSchema },
  prompt: `You are a helpful financial assistant for an app named FiscalFlow.
Your task is to parse the user's voice command and determine the appropriate action to take.

You have two possible actions:
1.  **logTransaction**: Use this when the user wants to record an income or expense.
    - Infer the 'type' based on keywords (e.g., 'expense', 'spent', 'bought' -> expense; 'income', 'received', 'salary' -> income).
    - The 'category' must be one of the valid options provided in the schema.
    - If a specific store or source isn't mentioned, infer a sensible one (e.g., 'Groceries' for 'bought milk').
    - Default to today for the date.

2.  **createBudget**: Use this when the user wants to set a new budget for a category.

3.  **unknown**: If you cannot determine a valid action from the command, use this action and provide a brief, friendly reason.

Analyze the user's command and respond with a JSON object that matches the required action schema.

User command: "{{command}}"
`,
});

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantActionInputSchema,
    outputSchema: VoiceActionSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
