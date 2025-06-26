'use server';
/**
 * @fileOverview An AI flow to act as a voice assistant for the application.
 *
 * - assistantAction - A function that parses a user's voice command and determines the correct action.
 * - AssistantActionInput - The input type for the assistantAction function.
 * - AssistantActionOutput - The return type for the assistantAction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { defaultCategories } from '@/data/mock-data';

const LogTransactionParamsSchema = z.object({
    amount: z.number().describe('The monetary value of the transaction.'),
    category: z.string().describe(`The category of the transaction. Must be one of the following: ${defaultCategories.join(', ')}`),
    source: z.string().describe("The source of the transaction, e.g., 'Starbucks', 'Salary', 'Amazon'."),
    notes: z.string().optional().describe('Any additional notes for the transaction.'),
    type: z.enum(['income', 'expense']).describe("The type of the transaction, either 'income' or 'expense'."),
});

const CreateBudgetParamsSchema = z.object({
    category: z.string().describe(`The category for the budget. Must be one of the following: ${defaultCategories.join(', ')}`),
    limit: z.number().describe('The budget limit for this category.'),
});

// This is the schema for the actions our AI can decide to take.
export const VoiceActionSchema = z.union([
  z.object({
    action: z.literal('logTransaction'),
    params: LogTransactionParamsSchema,
  }),
  z.object({
    action: z.literal('createBudget'),
    params: CreateBudgetParamsSchema,
  }),
  z.object({
    action: z.literal('unknown'),
    reason: z.string().describe("The reason why the user's request could not be fulfilled."),
  }),
]);
export type VoiceAction = z.infer<typeof VoiceActionSchema>;

export const AssistantActionInputSchema = z.object({
  command: z.string(),
});
export type AssistantActionInput = z.infer<typeof AssistantActionInputSchema>;


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
