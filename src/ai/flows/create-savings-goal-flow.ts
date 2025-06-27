'use server';
/**
 * @fileOverview An AI flow to create a structured savings goal from a user's natural language description.
 *
 * - createSavingsGoal - A function that handles creating a savings goal.
 * - CreateSavingsGoalInput - The input type for the createSavingsGoal function.
 * - CreateSavingsGoalOutput - The return type for the createSavingsGoal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const CreateSavingsGoalInputSchema = z.object({
  userQuery: z.string().describe("The user's natural language description of their savings goal."),
});
export type CreateSavingsGoalInput = z.infer<typeof CreateSavingsGoalInputSchema>;

export const CreateSavingsGoalOutputSchema = z.object({
  title: z.string().describe('A concise title for the savings goal (e.g., "New Gaming Laptop").'),
  targetAmount: z.number().describe('The total amount the user wants to save.'),
  deadline: z.string().optional().describe('The target deadline in YYYY-MM-DD format if mentioned. If no year is mentioned, assume the next upcoming instance of that month/day.'),
});
export type CreateSavingsGoalOutput = z.infer<typeof CreateSavingsGoalOutputSchema>;


export async function createSavingsGoal(input: CreateSavingsGoalInput): Promise<CreateSavingsGoalOutput> {
  return createSavingsGoalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createSavingsGoalPrompt',
  input: {schema: CreateSavingsGoalInputSchema},
  output: {schema: CreateSavingsGoalOutputSchema},
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
    inputSchema: CreateSavingsGoalInputSchema,
    outputSchema: CreateSavingsGoalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
