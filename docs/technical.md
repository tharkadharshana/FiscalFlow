# FiscalFlow: Technical Documentation

This document provides a comprehensive technical overview of the FiscalFlow application, covering its architecture, data models, AI integration, and key component logic.

---

## 1. Project Overview & Tech Stack

FiscalFlow is a modern web application built with a focus on performance, type safety, and a seamless user experience.

*   **Framework:** [Next.js](https://nextjs.org/) 15 (using the App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://react.dev/) 19
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [ShadCN/UI](https://ui.shadcn.com/) for pre-built, accessible components.
*   **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore, Cloud Functions)
*   **AI/Generative Features:** [Firebase Genkit](https://firebase.google.com/docs/genkit) (v1.x) with the Google AI provider (Gemini models).
*   **State Management:** React Context API (`src/contexts/app-context.tsx`)
*   **Form Handling:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for schema validation.
*   **Deployment:** Firebase App Hosting & Cloud Functions.

---

## 2. File Structure

The `src` directory is organized to separate concerns, making the codebase modular and maintainable.

```
src/
├── ai/                    # Genkit AI Flows and configuration
│   ├── flows/             # Individual AI capabilities (e.g., receipt parsing)
│   └── genkit.ts          # Genkit initialization
├── app/                   # Next.js App Router: pages and layouts
│   ├── (auth)/            # Authentication routes (login page)
│   └── dashboard/         # Protected dashboard routes
├── components/            # Reusable React components
│   ├── auth/              # Auth-related components (login form)
│   ├── dashboard/         # Components specific to dashboard pages
│   └── ui/                # Generic UI components from ShadCN
├── contexts/              # React Context providers for global state
│   └── app-context.tsx    # Central state management for the entire app
├── data/                  # Static data, like default categories
│   └── mock-data.ts
├── hooks/                 # Custom React hooks
│   ├── use-mobile.ts      # Hook for detecting mobile viewports
│   └── use-toast.ts       # Custom toast notification system
├── lib/                   # Core application logic and utilities
│   ├── actions.ts         # Server Actions that bridge client and AI flows
│   ├── carbon.ts          # Logic for carbon footprint estimation
│   ├── firebase.ts        # Firebase initialization and configuration
│   └── utils.ts           # General utility functions (e.g., cn for classnames)
└── types/                 # TypeScript type definitions
    └── index.ts           # All shared type interfaces
```

---

## 3. Core Concepts & Data Flow

### 3.1. AppContext (`src/contexts/app-context.tsx`)

This is the heart of the application's client-side state management. It provides a single, centralized source of truth for all major data entities.

*   **Responsibilities:**
    *   Manages the current authenticated Firebase `user` and `userProfile`.
    *   Establishes real-time listeners to Firestore collections (`transactions`, `budgets`, etc.) using `onSnapshot`.
    *   Holds all fetched data in React state variables.
    *   Provides CRUD (Create, Read, Update, Delete) functions to the rest of the application (e.g., `addTransaction`, `updateBudget`). These functions contain the logic for interacting with Firestore.
*   **Key Logic:**
    *   **Micro-Savings:** The `addTransaction` function contains the logic to check for an active round-up savings goal. If an expense is not a whole number, it calculates the "spare change" and adds it to the goal's `currentAmount`.
    *   **Gamification:** The `calculateNewBadges` helper function is triggered during savings updates to award users virtual badges based on hitting certain percentage milestones.
    *   **Data Hydration:** Fetched Firestore data (e.g., Timestamps) is converted into client-friendly formats (e.g., ISO date strings).

### 3.2. Firebase Firestore Schema

All user data is stored in Firestore, organized under a top-level `users` collection. Security rules (`firestore.rules`) ensure that users can only access their own data.

*   `/users/{userId}`: Stores `UserProfile` data.
    *   `/transactions/{transactionId}`: Individual income/expense records.
    *   `/budgets/{budgetId}`: Monthly budget limits per category.
    *   `/financialPlans/{planId}`: AI-generated plans for large goals.
    *   `/recurringTransactions/{recurringId}`: Templates for scheduled transactions.
    *   `/savingsGoals/{goalId}`: User-defined savings goals with progress.
    *   `/investments/{investmentId}`: User's investment holdings.
    *   `/checklists/{checklistId}`: User's checklists for planned spending.
    *   `/checklistTemplates/{templateId}`: Reusable checklist templates.
    *   `/notifications/{notificationId}`: History of user notifications.


### 3.3. Firebase Cloud Functions (`functions/src/index.ts`)

Two backend Cloud Functions handle automated tasks:

1.  **`updateBudgetOnTransactionChange`**: A Firestore trigger that fires whenever a transaction is created, updated, or deleted. It automatically calculates the change in spending and updates the `currentSpend` field of the relevant monthly `Budget` document. This keeps budgets in sync without client-side calculations.
2.  **`generateRecurringTransactions`**: A scheduled Pub/Sub function that runs once every 24 hours. It queries all active `recurringTransactions` across all users and generates new `Transaction` documents if the next due date has passed.

---

## 4. AI Integration (Genkit)

All generative AI features are powered by Genkit. The implementation follows a strict pattern: a UI component calls a Server Action, which in turn invokes a Genkit Flow.

*   **Configuration (`src/ai/genkit.ts`):** Initializes Genkit with the `googleAI` plugin and sets the default model to `gemini-1.5-flash-latest`.

*   **Server Actions (`src/lib/actions.ts`):** These `async` functions are the public-facing API for the AI features. They are marked with `'use server'` and serve as a secure bridge between the client and the backend Genkit flows. They also handle error wrapping.

*   **Genkit Flows (`src/ai/flows/`):**
    *   **`parse-receipt.ts`**: Uses Gemini's multimodal capabilities. The prompt includes `{{media url=photoDataUri}}` to process the image. The flow is instructed to return a JSON object matching the `ParseReceiptOutputSchema`.
    *   **`generate-insights-flow.ts`**: A simple text-generation flow that analyzes a list of transactions and returns 2-3 actionable tips.
    *   **`create-financial-plan-flow.ts` / `create-monthly-budgets-flow.ts`**: These flows take natural language user input (`userQuery`) and use a detailed prompt to transform it into a structured JSON array of items, leveraging Zod schemas for output formatting.
    *   **`assistant-flow.ts`**: Implements a tool-use pattern. It takes a voice command and uses a `z.union` schema to decide which "action" to take (`logTransaction` or `createBudget`). This allows the AI to determine the appropriate function call and extract the necessary parameters.
    *   **`analyze-taxes-flow.ts`**: The most advanced flow. It uses a tool-based approach where the AI can call `calculatePayeTax` and `calculateVat` functions. Crucially, the prompt instructs the AI to prioritize any `taxDocument` text provided by the user, demonstrating how to combine generative reasoning with structured tool execution. A programmatic fallback is included for robustness.

---

## 5. Key UI Components

*   **Authentication (`components/auth/login-form.tsx`):**
    *   Uses the Firebase Web SDK (`signInWithEmailAndPassword`, `signInWithPopup`).
    *   Handles multiple providers: Email/Password, Google, and Apple (`OAuthProvider`).
    *   On the first successful sign-in (`getAdditionalUserInfo(result).isNewUser`), it creates the corresponding user document in the `/users/{userId}` collection in Firestore with default settings.

*   **Dialogs & Forms:**
    *   Most forms (e.g., `manual-entry-form.tsx`) use `react-hook-form` for state management and `zod` for validation via `zodResolver`. This provides a robust and type-safe way to handle user input.
    *   The AI-driven dialogs (`create-plan-dialog.tsx`) manage a `view` state (`input`, `loading`, `review`) to guide the user through the generation process.

*   **Tax Calculators (`components/dashboard/tax/*.tsx`):**
    *   These are client-side components that use `useState` and `useMemo` to perform real-time calculations based on the detailed Sri Lankan tax rules. The logic is self-contained within each component for clarity.

*   **Responsiveness & Navigation:**
    *   The `useIsMobile` hook determines the viewport size.
    *   The main sidebar (`components/ui/sidebar.tsx`) uses this hook to switch between a persistent desktop view and a mobile-friendly slide-out "sheet".
    *   A `SidebarTrigger` (`PanelLeft` icon) is conditionally rendered in the `Header` component for mobile devices.

---

## 6. Client-Side Logic Deep-Dive

*   **Carbon Estimation (`lib/carbon.ts`):**
    *   The `estimateCarbonFootprint` function is called within `addTransaction` and `updateTransaction` in the `app-context`.
    *   It uses a simple key-value map (`CARBON_FACTORS`) where each transaction category is assigned a CO₂e multiplier. The transaction amount is multiplied by this factor to produce an illustrative estimate.

*   **Currency Formatting (`contexts/app-context.tsx`):**
    *   The `formatCurrency` function is created with `useMemo` and depends on `userProfile?.currencyPreference`.
    *   This function uses the browser's native `Intl.NumberFormat` API, ensuring correct formatting for any given currency code (e.g., 'USD', 'LKR').
    *   All components that display money call this single function from the context, ensuring a consistent and user-configurable currency display across the app.
