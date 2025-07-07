import { config } from 'dotenv';
config();

import '@/ai/flows/parse-receipt.ts';
import '@/ai/flows/generate-insights-flow.ts';
import '@/ai/flows/create-financial-plan-flow.ts';
import '@/ai/flows/create-monthly-budgets-flow.ts';
import '@/ai/flows/assistant-flow.ts';
import '@/ai/flows/analyze-taxes-flow.ts';
import '@/ai/flows/create-savings-goal-flow.ts';
import '@/ai/flows/create-checklist-flow.ts';
import '@/ai/flows/parse-bank-statement-flow.ts';
