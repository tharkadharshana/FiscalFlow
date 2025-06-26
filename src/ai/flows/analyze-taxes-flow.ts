'use server';
/**
 * @fileOverview An AI flow to automatically analyze transactions and identify tax liabilities.
 *
 * - analyzeTaxes - A function that handles the tax analysis process.
 * - AnalyzeTaxesInput - The input type for the analyzeTaxes function.
 * - AnalyzeTaxesOutput - The return type for the analyzeTaxes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schemas for Tools
const PayeInputSchema = z.object({
    annualIncome: z.number().describe('The total annual income from all sources.'),
});

const VatInputSchema = z.object({
    amount: z.number().describe('The gross amount of the transaction.'),
    category: z.string().describe('The category of the transaction (e.g., Food, Groceries, Fuel).'),
    description: z.string().optional().describe('A description of the item purchased.'),
});

// Tool Definitions
const calculatePayeTax = ai.defineTool(
    {
        name: 'calculatePayeTax',
        description: 'Calculates the annual Personal Income Tax (PAYE) for a given gross annual income based on Sri Lankan tax brackets.',
        inputSchema: PayeInputSchema,
        outputSchema: z.number().describe('The total annual tax liability.'),
    },
    async ({ annualIncome }) => {
        const brackets = [
            { limit: 1_200_000, rate: 0 },
            { limit: 1_700_000, rate: 0.06 },
            { limit: 2_200_000, rate: 0.12 },
            { limit: 2_700_000, rate: 0.18 },
            { limit: 3_200_000, rate: 0.24 },
            { limit: 3_700_000, rate: 0.30 },
            { limit: Infinity, rate: 0.36 },
        ];
        let remainingIncome = annualIncome;
        let totalTax = 0;
        let previousLimit = 0;

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;
            const taxableInBracket = Math.min(remainingIncome, bracket.limit - previousLimit);
            if (taxableInBracket > 0) {
                totalTax += taxableInBracket * bracket.rate;
                remainingIncome -= taxableInBracket;
            }
            previousLimit = bracket.limit;
        }
        return Math.max(0, totalTax);
    }
);

const calculateVat = ai.defineTool(
    {
        name: 'calculateVat',
        description: 'Calculates the Value Added Tax (VAT) for a given transaction amount and category. Returns 0 if the item is exempt.',
        inputSchema: VatInputSchema,
        outputSchema: z.number().describe('The calculated VAT amount.'),
    },
    async ({ amount, category }) => {
        const VAT_RATE = 0.18;
        const EXEMPT_CATEGORIES = ['Rent', 'Gifts', 'Gift Income', 'Salary', 'Freelance', 'Investments', 'Bonus'];
        
        if (EXEMPT_CATEGORIES.includes(category)) {
            return 0;
        }
        // This calculation assumes the amount is inclusive of VAT.
        return amount - (amount / (1 + VAT_RATE));
    }
);

// Main Flow Schemas
const TransactionSchema = z.object({
    id: z.string(),
    type: z.enum(['income', 'expense']),
    amount: z.number(),
    category: z.string(),
    source: z.string(),
    date: z.string(),
});
export type AnalyzeTaxesInput = z.infer<typeof TransactionSchema>;

const TaxLiabilitySchema = z.object({
    taxType: z.string().describe('The type of tax, e.g., "PAYE", "VAT".'),
    description: z.string().describe('A brief description of the tax source.'),
    amount: z.number().describe('The calculated tax amount.'),
    sourceTransactionIds: z.array(z.string()).optional().describe('IDs of source transactions, if applicable.'),
});

const AnalyzeTaxesOutputSchema = z.object({
    liabilities: z.array(TaxLiabilitySchema),
});
export type AnalyzeTaxesOutput = z.infer<typeof AnalyzeTaxesOutputSchema>;

// Main Flow Definition
export async function analyzeTaxes(
  input: { transactions: AnalyzeTaxesInput[] }
): Promise<AnalyzeTaxesOutput> {
  return analyzeTaxesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTaxesPrompt',
  input: { schema: z.object({ transactions: z.array(TransactionSchema) }) },
  output: { schema: AnalyzeTaxesOutputSchema },
  tools: [calculatePayeTax, calculateVat],
  prompt: `You are an expert Sri Lankan tax accountant AI. Your task is to analyze a list of financial transactions and identify all potential direct and indirect tax liabilities for the user.

Follow these steps:
1.  **Calculate Annual Income:** Sum up all transactions of type 'income' to determine the user's gross annual income.
2.  **Calculate PAYE:** Use the 'calculatePayeTax' tool with the total annual income to determine the Personal Income Tax liability. Add this as a single liability.
3.  **Analyze Expenses for VAT:** For each 'expense' transaction, use the 'calculateVat' tool to determine if any Value Added Tax (VAT) was paid.
4.  **Consolidate VAT:** Sum up all the calculated VAT amounts from individual expenses into a single, total VAT liability.
5.  **Compile Report:** Create a final JSON object that lists all identified tax liabilities (e.g., PAYE, total VAT). For each liability, provide a clear description. For VAT, list the IDs of the transactions that contributed to it.

Here are the user's transactions:
{{#each transactions}}
- ID: {{this.id}}, Type: {{this.type}}, Amount: {{this.amount}}, Category: {{this.category}}, Source: {{this.source}}, Date: {{this.date}}
{{/each}}
`,
});


const analyzeTaxesFlow = ai.defineFlow(
  {
    name: 'analyzeTaxesFlow',
    inputSchema: z.object({ transactions: z.array(TransactionSchema) }),
    outputSchema: AnalyzeTaxesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
