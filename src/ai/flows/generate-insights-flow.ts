'use server';
/**
 * @fileOverview An AI flow to generate financial insights from transactions.
 *
 * - generateInsights - A function that handles generating financial advice.
 * - GenerateInsightsInput - The input type for the generateInsights function.
 * - GenerateInsightsOutput - The return type for the generateInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
    amount: z.number(),
    category: z.string(),
    source: z.string(),
    date: z.string(),
    type: z.enum(['income', 'expense']),
});

const GenerateInsightsInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('A list of the user\'s recent transactions.'),
});
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

const GenerateInsightsOutputSchema = z.object({
    insights: z.array(z.string().describe("A concise and actionable financial insight or saving tip based on the user's spending."))
    .min(2)
    .max(3)
    .describe("An array of 2-3 personalized financial insights."),
  });
export type GenerateInsightsOutput = z.infer<typeof GenerateInsightsOutputSchema>;

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
