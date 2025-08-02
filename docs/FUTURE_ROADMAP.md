# FiscalFlow - Future Roadmap & Remaining Work

This document outlines the strategic plan for completing the FiscalFlow application, focusing on the remaining features from the initial product requirements.

---

##  Epic 1: Full Receipt Scanning & OCR Integration

**Goal:** Allow users to scan a physical receipt with their device's camera, automatically extract all transaction details using AI, and save it as one or more transactions.

**Current Status:** UI placeholders and basic camera components exist. The `parse-receipt.ts` AI flow is defined but not fully integrated.

**Implementation Steps:**

1.  **Build Camera & Upload UI (`receipt-scanner.tsx`):**
    *   Create a user-friendly interface for capturing a photo or uploading an image file.
    *   Implement real-time camera view using `navigator.mediaDevices.getUserMedia`.
    *   Provide clear user feedback during capture, upload, and processing states.

2.  **Enhance AI Flow (`parse-receipt.ts`):**
    *   Refine the AI prompt to be more robust in handling various receipt formats.
    *   Instruct the AI to intelligently split a single receipt into multiple transactions if items from different categories are present (e.g., "Groceries" and "Health & Fitness" on one supermarket receipt).
    *   Ensure the output schema is strictly enforced.

3.  **Create a Review & Confirmation Screen:**
    *   After the AI processes the receipt, present the extracted data to the user in an intuitive review interface.
    *   The user must be able to edit every extracted field (store name, date, category, line items, total).
    *   Allow the user to approve the final transaction(s) before they are saved to the database.

4.  **Update `app-context.tsx`:**
    *   Create a new function `scanReceiptWithLimit` that encapsulates the call to the AI server action and handles free-tier usage limits.

---

## Epic 2: Advanced Reporting Engine

**Goal:** Empower users to generate, filter, and export detailed financial reports in both PDF and CSV formats.

**Current Status:** The `/dashboard/reports` page is a placeholder.

**Implementation Steps:**

1.  **Build the Reports UI (`reports/page.tsx`):**
    *   Create a comprehensive set of filters:
        *   Date Range (Monthly, Yearly, Custom)
        *   Transaction Type (Income, Expense)
        *   Category (Multi-select)
    *   Design a clear and concise summary view to display the generated report data (totals, charts, etc.).

2.  **Implement Data Filtering Logic:**
    *   In the `ReportsPage` component, write the logic to filter the user's `transactions` based on the selected criteria.

3.  **Develop Export Functionality:**
    *   **CSV Export:** Use a library like `papaparse` to convert the filtered transaction data into a CSV string and trigger a browser download.
    *   **PDF Export:** Use libraries like `jspdf` and `jspdf-autotable` to generate a professional-looking PDF document containing a summary, charts, and a detailed transaction table.

4.  **Integrate with Usage Limits:**
    *   Ensure the report generation is tied to the `generateReportWithLimit` function in the `AppContext` to manage free-tier limitations.

---

## Epic 3: Dashboard Polish & Savings Gamification

**Goal:** Complete all dashboard components and fully implement the gamified features for savings goals.

**Current Status:** Savings goals can be created, but the gamification logic (badges) is not yet implemented. Some dashboard cards may be placeholders.

**Implementation Steps:**

1.  **Implement Badge Awarding Logic:**
    *   In `app-context.tsx`, enhance the `addTransaction` and `updateSavingsGoal` functions.
    *   After any update to a savings goal's `currentAmount`, call a new helper function `calculateNewBadges`.
    *   This helper will check if the user has crossed a milestone (e.g., 25%, 50%, 100%) and award a new `Badge` object if they have.
    *   Show a notification when a new badge is earned.

2.  **Display Badges (`savings-goal-card.tsx`):**
    *   Update the `SavingsGoalCard` component to display the earned badges, complete with icons and tooltips showing the achievement date.

3.  **Finalize All Dashboard Cards:**
    *   Review all components on the main dashboard (`dashboard/page.tsx`), such as `SummaryCards`, `SpendChart`, and `TopCategories`, to ensure they are fully functional and display accurate data for the current financial cycle.

---

## Epic 4: Automated Transaction Imports (Gmail)

**Goal:** Provide a key premium feature to automatically import bills and receipts from a user's connected Gmail account.

**Current Status:** The OAuth flow for connecting Gmail is implemented, and tokens are stored in Firestore. No processing logic exists yet.

**Implementation Steps:**

1.  **Create a New Cloud Function:**
    *   Create a new Pub/Sub scheduled function (e.g., `scanGmailForBills`) that runs periodically (e.g., every 6 hours).
    *   This function will query for all users who have connected their Gmail account.

2.  **Implement Gmail API Logic:**
    *   For each user, use their stored OAuth tokens to authenticate with the Gmail API.
    *   Perform a search for relevant emails (e.g., from known vendors, with keywords like "invoice" or "receipt").
    *   For each found email, download the body content and any attachments (PDFs, images).

3.  **AI-Powered Extraction:**
    *   Pass the email content and/or attachments to the existing AI flows (`parse-receipt.ts` or a new, specialized flow for parsing email text).
    *   The AI will extract the transaction details just like it does for a scanned receipt.

4.  **Store as Transactions:**
    *   Save the extracted data as new transactions in the user's Firestore database.
    *   Implement a mechanism to avoid duplicate imports (e.g., by storing the IDs of processed emails).
    *   Send an in-app notification to the user summarizing the newly imported transactions.