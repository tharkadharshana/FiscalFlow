
'use server';
/**
 * @fileOverview An AI flow to generate financial insights from transactions.
 *
 * - generateInsights - A function that handles generating financial advice.
 */

import {ai} from '@/ai/genkit';
import { GenerateInsightsInputSchema, GenerateInsightsOutputSchema } from '@/types/schemas';
import type { GenerateInsightsInput, GenerateInsightsOutput } from '@/types/schemas';

export async function generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsOutput> {
  return generateInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInsightsPrompt',
  input: {schema: GenerateInsightsInputSchema},
  output: {schema: GenerateInsightsOutputSchema},
  prompt: `You are a friendly and helpful financial advisor AI called FiscalFlow Insights. Your goal is to help users improve their financial health.

Analyze the following list of recent transactions and provide 2-3 short, personalized, and actionable saving tips or spending observations. The user wants practical advice they can use.

- Be encouraging and positive.
- Base your insights directly on the data provided.
- If there are a lot of expenses in one category, point it out and suggest an alternative.
- If there are very few transactions, just provide general saving tips.
- Keep each insight to a single sentence.

Here are the transactions:
{{#each transactions}}
- {{date}}: {{type}} of \${{amount}} at "{{source}}" ({{category}})
{{/each}}
`,
});

const generateInsightsFlow = ai.defineFlow(
  {
    name: 'generateInsightsFlow',
    inputSchema: GenerateInsightsInputSchema,
    outputSchema: GenerateInsightsOutputSchema,
  },
  async input => {
    // Don't generate insights if there are fewer than 3 transactions
    if (input.transactions.length < 3) {
        return { insights: [
            "Start by logging a few more transactions to get personalized insights!",
            "Setting up a budget for categories like 'Food' or 'Groceries' can be a great first step.",
            "Review your subscriptions to see if there are any you no longer need."
        ]};
    }
    const {output} = await prompt(input);
    return output!;
  }
);
