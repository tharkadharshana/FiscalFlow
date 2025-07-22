// src/types/schemas.ts

/**
 * @fileOverview This file contains all Zod schemas and their inferred TypeScript types
 * used across the application, particularly for AI flows and actions. This centralizes
 * type definitions and ensures that "use server" files do not export non-function objects.
 */

import { z } from 'zod';
import { defaultCategories, defaultExpenseCategories } from '@/data/mock-data';

// --- Transaction & Financial Data Schemas ---
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category: z.string(),
  source: z.string(),
  date: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const SimplifiedInvestmentSchema = z.object({
  name: z.string(),
  assetType: z.string(),
  marketValue: z.number(),
});
export type SimplifiedInvestment = z.infer<typeof SimplifiedInvestmentSchema>;

export const SimplifiedSavingsGoalSchema = z.object({
  title: z.string(),
  currentAmount: z.number(),
});
export type SimplifiedSavingsGoal = z.infer<typeof SimplifiedSavingsGoalSchema>;


// --- Analyze Taxes Schemas ---
export const TaxLiabilitySchema = z.object({
  taxType: z.string().describe('The official name of the tax, e.g., "Value Added Tax (VAT)", "Goods and Services Tax (GST)", "PAYE (Income Tax)", "Capital Gains Tax".'),
  description: z.string().describe('A brief, helpful description of how the tax was calculated (e.g., "Calculated on total income based on 2025 brackets.").'),
  amount: z.number().describe('The calculated tax amount. The AI must perform the calculation and return the final number.'),
  sourceTransactionIds: z.array(z.string()).optional().describe('IDs of source transactions, if applicable.'),
});
export type TaxLiability = z.infer<typeof TaxLiabilitySchema>;

export const AnalyzeTaxesInputSchema = z.object({
  transactions: z.array(TransactionSchema),
  investments: z.array(SimplifiedInvestmentSchema).optional().describe("A list of the user's current investment holdings."),
  savingsGoals: z.array(SimplifiedSavingsGoalSchema).optional().describe("A list of the user's savings goals, which may generate interest income."),
  countryCode: z.string().describe("The user's country code (e.g., US, LK, GB). This is the primary context for determining tax rules."),
  taxDocument: z.string().optional().describe('User-provided text describing tax rules. This should be treated as the highest priority source of truth.'),
});
export type AnalyzeTaxesInput = z.infer<typeof AnalyzeTaxesInputSchema>;

export const AnalyzeTaxesOutputSchema = z.object({
    liabilities: z.array(TaxLiabilitySchema),
});
export type AnalyzeTaxesOutput = z.infer<typeof AnalyzeTaxesOutputSchema>;


// --- Voice Assistant Schemas ---
export const LogTransactionParamsSchema = z.object({
    amount: z.number().describe('The monetary value of the transaction.'),
    category: z.string().describe(`The category of the transaction. Must be one of the following: ${defaultCategories.join(', ')}`),
    source: z.string().describe("The source of the transaction, e.g., 'Starbucks', 'Salary', 'Amazon'."),
    notes: z.string().optional().describe('Any additional notes for the transaction.'),
    type: z.enum(['income', 'expense']).describe("The type of the transaction, either 'income' or 'expense'."),
});

export const CreateBudgetParamsSchema = z.object({
    category: z.string().describe(`The category for the budget. Must be one of the following: ${defaultCategories.join(', ')}`),
    limit: z.number().describe('The budget limit for this category.'),
});

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


// --- Trip Plan Schemas (formerly Financial Plan) ---
export const TripItemSchema = z.object({
    id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
    description: z.string().describe('A clear description of the expense item.'),
    category: z.string().describe('A suitable category for the item (e.g., Flights, Food, Fees).'),
    predictedCost: z.number().describe('The estimated cost for this item.'),
    isAiSuggested: z.boolean().optional().describe('Set to true if this item was suggested by the AI, not the user.'),
});
export type TripItem = z.infer<typeof TripItemSchema>;

export const CreateTripPlanOutputSchema = z.object({
    title: z.string().describe('A concise title for the trip plan (e.g., "Paris Trip 2024").'),
    items: z.array(TripItemSchema).describe('A list of all plan items, both from the user and suggested by the AI.'),
});
export type CreateTripPlanOutput = z.infer<typeof CreateTripPlanOutputSchema>;

export const CreateTripPlanInputSchema = z.object({
    userQuery: z.string().describe("The user's natural language description of their goal or what to add to the plan."),
    existingPlan: CreateTripPlanOutputSchema.optional().describe("The existing plan if the user is adding to it.")
});
export type CreateTripPlanInput = z.infer<typeof CreateTripPlanInputSchema>;


// --- Monthly Budgets Schemas ---
export const BudgetItemSchema = z.object({
    id: z.string().describe("A unique ID for the item, e.g., a short hash or timestamp-based."),
    description: z.string().describe("The name of the item to purchase."),
    predictedCost: z.number().optional().describe("The estimated cost of this single item, if the user mentions it."),
});
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

export const BudgetSchema = z.object({
    category: z.string().describe(`A suitable category for the budget. Must be one of: ${defaultExpenseCategories.join(', ')}`),
    limit: z.number().describe('The total budget limit for this category.'),
    items: z.array(BudgetItemSchema).optional().describe("A list of specific items the user mentioned for this budget category."),
});
export type Budget = z.infer<typeof BudgetSchema>;

export const CreateMonthlyBudgetsOutputSchema = z.object({
    budgets: z.array(BudgetSchema).describe('A list of budget items generated from the user query.'),
});
export type CreateMonthlyBudgetsOutput = z.infer<typeof CreateMonthlyBudgetsOutputSchema>;

export const CreateMonthlyBudgetsInputSchema = z.object({
    userQuery: z.string().describe("The user's natural language description of their monthly budget goals."),
    existingCategories: z.array(z.string()).describe("A list of budget categories that already exist to avoid duplication.")
});
export type CreateMonthlyBudgetsInput = z.infer<typeof CreateMonthlyBudgetsInputSchema>;


// --- Savings Goal Schemas ---
export const CreateSavingsGoalOutputSchema = z.object({
    title: z.string().describe('A concise title for the savings goal (e.g., "New Gaming Laptop").'),
    targetAmount: z.number().describe('The total amount the user wants to save.'),
    deadline: z.string().optional().describe('The target deadline in YYYY-MM-DD format if mentioned. If no year is mentioned, assume the next upcoming instance of that month/day.'),
});
export type CreateSavingsGoalOutput = z.infer<typeof CreateSavingsGoalOutputSchema>;

export const CreateSavingsGoalInputSchema = z.object({
    userQuery: z.string().describe("The user's natural language description of their savings goal."),
});
export type CreateSavingsGoalInput = z.infer<typeof CreateSavingsGoalInputSchema>;


// --- Generate Insights Schemas ---
export const GenerateInsightsInputSchema = z.object({
    transactions: z.array(TransactionSchema).describe('A list of the user\'s recent transactions.'),
});
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

export const GenerateInsightsOutputSchema = z.object({
    insights: z.array(z.string().describe("A concise and actionable financial insight or saving tip based on the user's spending."))
    .min(2)
    .max(3)
    .describe("An array of 2-3 personalized financial insights."),
});
export type GenerateInsightsOutput = z.infer<typeof GenerateInsightsOutputSchema>;


// --- Bank Statement Schemas ---
export const ParsedTransactionSchema = z.object({
    date: z.string().describe('The transaction date in YYYY-MM-DD format. If no year is present, assume the current year.'),
    description: z.string().describe('The full transaction description from the statement.'),
    amount: z.number().describe('The transaction amount. Use negative numbers for debits/expenses and positive for credits/income.'),
    category: z.string().describe(`A suggested category for this transaction. Must be one of the following: ${defaultCategories.join(', ')}`),
});
export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>;

export const ParseBankStatementOutputSchema = z.object({
    transactions: z.array(ParsedTransactionSchema),
});
export type ParseBankStatementOutput = z.infer<typeof ParseBankStatementOutputSchema>;

export const ParseBankStatementInputSchema = z.object({
    fileDataUri: z
      .string()
      .describe(
        "A bank statement file (like a PDF), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
});
export type ParseBankStatementInput = z.infer<typeof ParseBankStatementInputSchema>;


// --- Receipt Parsing Schemas ---
export const ParseReceiptInputSchema = z.object({
    photoDataUri: z
      .string()
      .describe(
        "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
});
export type ParseReceiptInput = z.infer<typeof ParseReceiptInputSchema>;
  
export const ParseReceiptOutputSchema = z.object({
      storeName: z.string().optional().describe('The name of the store or merchant.'),
      transactionDate: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format. If no year is present, assume the current year.'),
      totalAmount: z.number().optional().describe('The final total amount of the transaction.'),
      suggestedCategory: z.string().describe('A suggested category for this transaction like "Food", "Groceries", "Transport", etc.'),
      lineItems: z.array(z.object({ description: z.string(), amount: z.number().optional() })).optional().describe('An array of line items from the receipt.'),
      rawText: z.string().optional().describe('The full raw text extracted from the receipt for debugging.'),
});
export type ParseReceiptOutput = z.infer<typeof ParseReceiptOutputSchema>;
