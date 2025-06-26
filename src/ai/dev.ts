import { config } from 'dotenv';
config();

import '@/ai/flows/parse-receipt.ts';
import '@/ai/flows/generate-insights-flow.ts';
import '@/ai/flows/create-financial-plan-flow.ts';
import '@/ai/flows/create-monthly-budgets-flow.ts';
