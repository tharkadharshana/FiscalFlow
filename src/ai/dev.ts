
import { config } from 'dotenv';
config();

import '@/ai/flows/parse-receipt.ts';
import '@/ai/flows/generate-insights-flow.ts';
import '@/ai/flows/create-trip-plan-flow.ts';
import '@/ai/flows/create-monthly-budgets-flow.ts';
import '@/ai/flows/assistant-flow.ts';
import '@/ai/flows/analyze-taxes-flow.ts';
import '@/ai/flows/create-savings-goal-flow.ts';
// The flow file itself is still needed, but it no longer exports schemas.
import '@/ai/flows/parse-bank-statement-flow.ts';
import '@/ai/flows/create-checklist-flow.ts';
import '@/ai/flows/extract-text-flow.ts';

