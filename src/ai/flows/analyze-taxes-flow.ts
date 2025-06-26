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
        if (annualIncome <= 1_200_000) return 0;
    
        let tax = 0;
        let incomeLeft = annualIncome;
    
        if (incomeLeft > 3_700_000) {
            tax += (incomeLeft - 3_700_000) * 0.36;
            incomeLeft = 3_700_000;
        }
        if (incomeLeft > 3_200_000) {
            tax += (incomeLeft - 3_200_000) * 0.30;
            incomeLeft = 3_200_000;
        }
        if (incomeLeft > 2_700_000) {
            tax += (incomeLeft - 2_700_000) * 0.24;
            incomeLeft = 2_700_000;
        }
        if (incomeLeft > 2_200_000) {
            tax += (incomeLeft - 2_200_000) * 0.18;
            incomeLeft = 2_200_000;
        }
        if (incomeLeft > 1_700_000) {
            tax += (incomeLeft - 1_700_000) * 0.12;
            incomeLeft = 1_700_000;
        }
        if (incomeLeft > 1_200_000) {
            tax += (incomeLeft - 1_200_000) * 0.06;
        }
        return tax;
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

const analyzeTaxesFlow = ai.defineFlow(
  {
    name: 'analyzeTaxesFlow',
    inputSchema: z.object({ transactions: z.array(TransactionSchema) }),
    outputSchema: AnalyzeTaxesOutputSchema,
  },
  async ({ transactions }) => {
    const liabilities: z.infer<typeof TaxLiabilitySchema>[] = [];
    
    // 1. Calculate Annual Income and PAYE
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    if (totalIncome > 0) {
        const payeTax = await calculatePayeTax({ annualIncome: totalIncome });
        if (payeTax > 0) {
            liabilities.push({
                taxType: 'PAYE (Income Tax)',
                description: `Estimated annual income tax on a total income of ${totalIncome.toFixed(2)}.`,
                amount: payeTax,
            });
        }
    }

    // 2. Calculate Total VAT from expenses
    let totalVat = 0;
    const vatTransactionIds: string[] = [];

    for (const transaction of transactions) {
        if (transaction.type === 'expense') {
            const vatAmount = await calculateVat({
                amount: transaction.amount,
                category: transaction.category,
            });
            if (vatAmount > 0) {
                totalVat += vatAmount;
                vatTransactionIds.push(transaction.id);
            }
        }
    }

    if (totalVat > 0) {
        liabilities.push({
            taxType: 'VAT (Value Added Tax)',
            description: 'Estimated total VAT paid on goods and services.',
            amount: totalVat,
            sourceTransactionIds: vatTransactionIds,
        });
    }

    return { liabilities };
  }
);
