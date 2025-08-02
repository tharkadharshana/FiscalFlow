

// src/types/schemas.ts

/**
 * @fileOverview This file contains all Zod schemas and their inferred TypeScript types
 * used across the application, particularly for AI flows and actions. This centralizes
 * type definitions and ensures that "use server" files do not export non-function objects.
 */

import { z } from 'zod';
import { defaultCategories, defaultExpenseCategories } from '@/data/mock-data';

// --- Transaction & Financial Data Schemas ---
export const TaxDetailsSchema = z.object({
  tariff: z.number().describe('Calculated tariff/customs duty for the item.'),
  vat: z.number().describe('Calculated Value Added Tax (VAT) for the item.'),
  otherTaxes: z.number().describe('Any other applicable duties like Excise.'),
  shopFee: z.number().describe('The remaining base price of the item after all taxes are subtracted. P - T - V.'),
  isAnalyzed: z.boolean().describe('A flag to indicate the AI has processed this item.'),
});
export type TaxDetails = z.infer<typeof TaxDetailsSchema>;

export const TransactionItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  taxDetails: TaxDetailsSchema.optional(),
});
export type TransactionItem = z.infer<typeof TransactionItemSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category: z.string(),
  source: z.string(),
  date: z.string(),
  notes: z.string().optional(),
  items: z.array(TransactionItemSchema).optional(),
  isTaxAnalyzed: z.boolean().optional(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

// --- Analyze Taxes Schemas ---
export const AnalyzeTaxesInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe("An array of transactions that have not been analyzed yet (isTaxAnalyzed is false or missing)."),
  countryCode: z.string().describe("The user's country code (e.g., LK for Sri Lanka). This is the primary context for determining tax rules."),
  taxDocument: z.string().optional().describe("Optional custom tax rules provided by the user. The AI should prioritize these rules over its internal knowledge.")
});
export type AnalyzeTaxesInput = z.infer<typeof AnalyzeTaxesInputSchema>;

export const AnalyzeTaxesOutputSchema = z.object({
    analyzedTransactions: z.array(TransactionSchema).describe("The same array of transactions, but with the 'items.taxDetails' and 'isTaxAnalyzed' fields populated with the analysis results."),
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
    defaultCategories: z.array(z.string()),
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

// This is the new, detailed Bill Schema
export const ParsedBillSchema = z.object({
  merchantName: z.string().optional().describe('The name of the store or merchant.'),
  merchantAddress: z.string().optional().describe('The address of the merchant.'),
  merchantPhone: z.string().optional().describe('The phone number of the merchant.'),
  transactionDate: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format.'),
  transactionTime: z.string().optional().describe('The time of the transaction in HH:mm format.'),
  lineItems: z.array(z.object({
    description: z.string().describe('The description of the item purchased.'),
    quantity: z.number().optional().describe('The quantity of the item.'),
    unitPrice: z.number().optional().describe('The price of a single unit of the item.'),
    totalPrice: z.number().describe('The final price for this line item (quantity * unit price).'),
  })).optional().describe('An array of all line items from the receipt.'),
  subtotal: z.number().optional().describe('The total amount before taxes and discounts.'),
  taxes: z.array(z.object({
    description: z.string().describe('The type of tax (e.g., VAT, GST, Sales Tax).'),
    amount: z.number().describe('The amount of the tax.'),
  })).optional().describe('An array of all taxes listed on the receipt.'),
  discounts: z.array(z.object({
    description: z.string().describe('The description of the discount (e.g., "Coupon", "20% Off").'),
    amount: z.number().describe('The amount of the discount (as a positive number).'),
  })).optional(),
  totalAmount: z.number().describe('The final total amount paid.'),
  paymentMethod: z.string().optional().describe('The method of payment used (e.g., "Cash", "Visa ****1234").'),
  receiptNumber: z.string().optional().describe('The receipt or transaction ID number.'),
  currency: z.string().optional().describe('The three-letter currency code (e.g., USD, EUR).'),
  rawText: z.string().optional().describe('The full raw text extracted from the receipt for debugging.'),
});
export type ParsedBill = z.infer<typeof ParsedBillSchema>;

// This schema will wrap the new ParsedBillSchema for the flow's output
export const ParseReceiptOutputSchema = z.object({
  bill: ParsedBillSchema.optional(),
  rawText: z.string().optional().describe('The full raw text extracted from the receipt for debugging.'),
});
export type ParseReceiptOutput = z.infer<typeof ParseReceiptOutputSchema>;

// LEGACY SCHEMA for backwards compatibility if needed, though we are replacing its usage.
export const ParsedReceiptTransactionSchema = z.object({
    storeName: z.string().optional().describe('The name of the store or merchant.'),
    transactionDate: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format. If no year is present, assume the current year.'),
    suggestedCategory: z.string().describe('A suggested category for this transaction like "Food", "Groceries", etc.'),
    lineItems: z.array(z.object({ description: z.string(), amount: z.number().optional() })).optional().describe('An array of line items from the receipt for this category.'),
    totalAmount: z.number().optional().describe('The sum of the line items for this specific transaction.'),
});
export type ParsedReceiptTransaction = z.infer<typeof ParsedReceiptTransactionSchema>;


// --- Trip Plan Schemas ---
export const TripItemSchema = z.object({
    id: z.string().describe("A unique ID for the item."),
    description: z.string().min(1, "Description can't be empty."),
    category: z.string(),
    predictedCost: z.coerce.number().min(0, 'Cost must be a positive number.'),
    actualCost: z.number().nullable(),
    isAiSuggested: z.boolean().optional(),
});
export type TripItem = z.infer<typeof TripItemSchema>;

export const CreateTripPlanOutputSchema = z.object({
  title: z.string().describe('A concise title for the trip plan (e.g., "Summer Vacation to Italy", "Weekend Camping Trip").'),
  items: z.array(TripItemSchema).describe('A list of all items for the trip plan.'),
});
export type CreateTripPlanOutput = z.infer<typeof CreateTripPlanOutputSchema>;

export const CreateTripPlanInputSchema = z.object({
    userQuery: z.string().describe("The user's natural language description of their trip."),
    existingPlan: CreateTripPlanOutputSchema.optional().describe("An existing plan to modify or add to."),
});
export type CreateTripPlanInput = z.infer<typeof CreateTripPlanInputSchema>;


// --- Checklist Schemas ---
export const ChecklistItemSchema = z.object({
    id: z.string().describe("A unique ID for the item."),
    description: z.string().describe('A clear description of the expense item.'),
    predictedCost: z.number().describe('The estimated cost for this item.'),
    category: z.string().describe(`A suitable category. Must be one of: ${defaultExpenseCategories.join(', ')}`),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const CreateChecklistOutputSchema = z.object({
    title: z.string().describe('A concise title for the checklist (e.g., "Weekly Groceries", "Monthly Bills").'),
    iconName: z.string().describe('The name of the most appropriate icon for the checklist.'),
    items: z.array(ChecklistItemSchema).describe('A list of all items for the checklist.'),
});
export type CreateChecklistOutput = z.infer<typeof CreateChecklistOutputSchema>;

export const CreateChecklistInputSchema = z.object({
    userQuery: z.string().describe("The user's natural language description of their checklist."),
    availableIcons: z.array(z.string()).describe("List of available icon names to choose from."),
    availableCategories: z.array(z.string()).describe("List of available expense categories to choose from."),
});
export type CreateChecklistInput = z.infer<typeof CreateChecklistInputSchema>;
