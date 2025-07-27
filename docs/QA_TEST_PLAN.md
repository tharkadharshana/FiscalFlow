# FiscalFlow - Comprehensive QA Test Plan

## 1. Introduction

This document outlines the test cases for the FiscalFlow application to ensure all features are working correctly and meet the required specifications. Each test case includes a unique ID, the feature being tested, a description of the test scenario, step-by-step instructions, and the expected result.

**Test Case Structure:**

*   **Test Case ID:** A unique identifier for the test case (e.g., FF-AUTH-001).
*   **Feature:** The application feature being tested.
*   **Test Scenario:** A high-level description of the test's purpose.
*   **Steps:** Detailed instructions to execute the test.
*   **Expected Result:** The expected outcome if the test passes.
*   **Status:** To be filled in during testing (e.g., Pass, Fail, Blocked).

---

## 2. Test Cases

### 2.1. Authentication & User Management

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-AUTH-001 | Sign Up | Verify a new user can sign up with email and password. | 1. Navigate to the login page. 2. Click "Sign up". 3. Enter a valid name, new email, and password. 4. Click "Sign Up". | User is redirected to the `/dashboard`. A success notification about email verification appears. A new user document is created in Firestore. | |
| FF-AUTH-002 | Login | Verify an existing user can log in. | 1. Navigate to the login page. 2. Enter an existing user's email and password. 3. Click "Log In". | User is redirected to the `/dashboard`. | |
| FF-AUTH-003 | Google Auth | Verify a new user can sign up/log in with Google. | 1. Navigate to the login page. 2. Click the "Google" button. 3. Complete the Google authentication flow. | User is redirected to the `/dashboard`. If new, a user document is created in Firestore. | |
| FF-AUTH-004 | Apple Auth | Verify a new user can sign up/log in with Apple. | 1. Navigate to the login page. 2. Click the "Apple" button. 3. Complete the Apple authentication flow. | User is redirected to the `/dashboard`. If new, a user document is created in Firestore. | |
| FF-AUTH-005 | Password Reset | Verify the "Forgot Password" flow. | 1. Navigate to the login page. 2. Click "Forgot password?". 3. Enter the email of an existing account. 4. Click "Send Reset Link". | A success notification appears. An email is sent to the user with a password reset link. | |
| FF-AUTH-006 | Logout | Verify user can log out successfully. | 1. Be logged in. 2. In the sidebar, click "Log Out". | User is redirected to the login page. | |

### 2.2. Dashboard

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-DASH-001 | Summary Cards | Verify that the Total Income, Total Expenses, and Net Worth cards display correct data. | 1. Add several income and expense transactions. 2. Add an investment. 3. Navigate to the Dashboard. | `Total Income` card shows the sum of all income transactions. `Total Expenses` card shows the sum of all expense transactions. `Net Worth` card shows (Total Income - Total Expenses + Total Investment Value). | |
| FF-DASH-002 | Spending Trend | Verify the spending chart shows data for the last 30 days. | 1. Add expenses on various dates within the last 30 days. 2. View the "Spending Trend" chart. | The chart displays an area graph representing the total expenses for each day over the last 30 days. | |
| FF-DASH-003 | Top Categories | Verify the top spending categories are displayed correctly. | 1. Add expenses across multiple categories, with some categories having higher totals. | The "Top Spending Categories" card shows the top 3 expense categories, ordered by total amount, with correct progress bars. | |
| FF-DASH-004 | Recent Transactions | Verify the recent transactions list is accurate. | 1. Add 5+ transactions. | The "Recent Transactions" card shows the latest 5 transactions in reverse chronological order. | |
| FF-DASH-005 | Portfolio Overview | Verify the investment portfolio overview is correct. | 1. Add multiple investments of different types. | The chart displays the allocation by asset type. The total value is calculated correctly. | |
| FF-DASH-006 | Smart Insights | Verify AI insights are generated based on transaction data. | 1. Add at least 3-5 transactions. 2. Wait for the "Smart Insights" card to load. | The card displays 2-3 relevant, actionable financial tips based on the logged transactions. | |

### 2.3. Budgets & Allocations

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-BUDGET-001 | AI Budget Creation | Verify AI can create multiple budgets from a text prompt. | 1. Go to Budgets page. 2. Click "Add Budget". 3. Use AI Text tab. 4. Enter: "Set a $500 budget for Groceries, $100 for Transport, and $200 for Entertainment." 5. Click "Generate with AI". 6. Save the reviewed budgets. | Three budget cards are created with the correct categories and limits. | |
| FF-BUDGET-002 | Manual Transaction Tracking | Verify manual expenses update the correct budget. | 1. Ensure a "Groceries" budget exists. 2. Manually add a $75 expense transaction in the "Groceries" category. 3. Navigate to the Budgets page. | The "Groceries" budget card shows $75 spent, and the progress bar is updated. | |
| FF-BUDGET-003 | Budget Alert Threshold | Verify the progress bar turns red when spending exceeds 90%. | 1. Create/edit a "Transport" budget with a limit of $50. 2. Manually add a $48 expense in the "Transport" category. 3. View the budget card. | The progress bar on the "Transport" budget card is red. | |
| FF-BUDGET-004 | Receipt Scan & Auto-Split | Verify that a single receipt with multiple categories correctly splits into separate transactions and updates budgets. | 1. Go to Add Transaction > Scan Receipt. 2. Upload a clear receipt image containing items like "Milk $5" and "Shampoo $10". 3. In the review step, ensure AI has categorized them as "Groceries" and "Health & Fitness" respectively. 4. Save the transaction. | Two new transactions are created: one for $5 (Groceries) and one for $10 (Health & Fitness). The respective budget envelopes are updated with these amounts. | |
| FF-BUDGET-005 | Financial Plan Lifecycle | Verify creating, starting, and ending a financial plan (trip). | 1. Create a "Vacation" plan. 2. Click "Start Trip". 3. The banner appears. 4. Log a new expense; it should link to the trip. 5. Click "End Trip" on the card or banner. | All steps work. The banner appears/disappears. The expense is correctly linked to the plan. The plan status changes from 'planning' to 'active' to 'completed'. | |

### 2.4. Transaction Management

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-TRX-001 | Add Expense | Verify a new expense can be added manually. | 1. Click "Add Transaction". 2. Fill out the expense form with all details. 3. Submit the form. | The new expense appears in the transaction list. A success notification is shown. | |
| FF-TRX-002 | Add Income | Verify a new income can be added manually. | 1. Click "Add Transaction". 2. Switch to the "Income" tab. 3. Fill out the form. 4. Submit. | The new income appears in the transaction list. | |
| FF-TRX-003 | Edit Transaction | Verify an existing transaction can be edited. | 1. On the Transactions page, click the three-dots menu on a transaction and select "Edit". 2. Change a value (e.g., amount). 3. Save. | The transaction is updated in the list with the new value. | |
| FF-TRX-004 | Delete Transaction | Verify a transaction can be deleted. | 1. On the Transactions page, click the three-dots menu on a transaction and select "Delete". 2. Confirm deletion. | The transaction is removed from the list. | |
| FF-TRX-005 | Recurring Transactions | Verify the full lifecycle of a recurring transaction. | 1. Navigate to the recurring transactions tab. 2. Add a new recurring expense (e.g., monthly). 3. Edit the recurring item. 4. Delete the item. | All CRUD operations work as expected. A success notification appears for each action. | |
| FF-TRX-006 | Carbon Footprint Badge | Verify carbon footprint is shown on the transactions page. | 1. Add an expense in the "Transport" category. 2. Navigate to the Transactions page. | The transaction row for the new expense displays a green badge with the estimated CO₂e value. | |

### 2.5. Savings Goals & Gamification

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-SAVE-001 | Create Goal | Verify a new savings goal can be created. | 1. Navigate to the "Savings Goals" page. 2. Click "New Goal". 3. Fill in the title, target amount, and an optional deadline. 4. Submit. | The new goal appears on the page as a card with a progress bar at 0%. | |
| FF-SAVE-002 | Round-up Savings | Verify the micro-savings feature works correctly. | 1. Create a savings goal and mark it as the "Micro-Savings Goal". 2. Add a new expense with a decimal value (e.g., $15.75). | The transaction is recorded for $15.75. The `currentAmount` of the designated savings goal increases by $0.25. | |
| FF-SAVE-003 | Badge Achievement | Verify badges are awarded for milestones. | 1. Create a savings goal with a target of $100. 2. Manually edit the goal's `currentAmount` in Firestore (or add transactions) to cross the $25, $50, $75, and $100 marks. | The goal card displays new badges ('25% Mark', '50% Mark', etc.) as each milestone is reached. A notification appears for each achievement. | |

### 2.6. Tax Center

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-TAX-001 | Tax Flagging | Verify a transaction can be flagged for tax purposes. | 1. Create/edit an expense. 2. Toggle the "Tax Deductible" switch on. 3. Save the transaction. 4. Navigate to the Tax Center. | The transaction appears in the "Manually Flagged Transactions" table. | |
| FF-TAX-002 | Vehicle Import Calc | Verify the Vehicle Import Calculator logic. | 1. Go to Tax Center > Calculators > Vehicle Import. 2. Enter CIF Value: `5500000`. 3. Enter Engine CC: `1500`. 4. Select Fuel Type: `Petrol`. | The calculated breakdown appears. Total Landed Cost should be approximately `LKR 10,266,000` based on the provided logic. Each tax component (CID, PAL, VAT, etc.) is shown. | |
| FF-TAX-003 | Income Tax Calc | Verify the PAYE calculator. | 1. Go to Tax Center > Calculators > Income Tax. 2. Enter Annual Gross Income: `2,500,000`. | The calculator shows the correct total tax due based on the progressive Sri Lankan tax brackets (e.g., `(1.7M-1.2M)*0.06 + (2.2M-1.7M)*0.12 + (2.5M-2.2M)*0.18`). | |
| FF-TAX-004 | AI Tax Analysis | Verify the AI engine correctly identifies PAYE and VAT. | 1. Ensure transactions include multiple income sources (totaling > 1.2M LKR) and multiple expenses in VAT-liable categories (Food, Transport). 2. Go to the Tax Center and click "Run AI Analysis". | The AI returns a table with at least two liabilities: one for "PAYE (Income Tax)" on the total income, and one for "VAT" on the sum of eligible expenses. | |
| FF-TAX-005 | AI Custom Docs | Verify the AI uses custom documentation. | 1. In the AI Tax Analysis section, expand the "Provide Custom Tax Documentation" area. 2. Paste text: `VAT is 25% on all items`. 3. Run the AI analysis. | The AI's result description should mention it is using the custom rules. The calculated amounts may still use hardcoded tool values, but the reasoning should reflect the custom input. | |

### 2.7. Settings

| Test Case ID | Feature | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FF-SET-001 | Update Profile | Verify user can update their display name. | 1. Go to Settings. 2. Change the "Display Name". 3. Click "Save Changes". | A success notification appears. The name in the sidebar updates upon page refresh. | |
| FF-SET-002 | Change Currency | Verify changing currency preference updates the UI. | 1. Go to Settings. 2. Change "Currency" from USD to LKR. 3. Click "Save Changes". 4. Navigate to the Dashboard. | All monetary values (e.g., on summary cards) are now displayed in LKR with the correct currency symbol. | |
| FF-SET-003 | Custom Categories | Verify adding and deleting a custom category. | 1. Go to Settings > Manage Categories. 2. Add a new category named "My Test Category". 3. Verify it appears in the list. 4. Go to add a new transaction and verify "My Test Category" is in the category dropdown. 5. Go back to Settings and delete the category. | The category is successfully added and removed. The dropdown in the transaction form updates accordingly. | |

---

