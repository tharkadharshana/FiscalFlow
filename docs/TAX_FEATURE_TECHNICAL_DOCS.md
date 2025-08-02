# Technical Documentation: AI Tax Analysis Engine

This document provides a detailed technical overview of the AI Tax Analysis feature in FiscalFlow, covering its architecture, data flow, calculation logic, and core assumptions.

---

## 1. Feature Purpose & High-Level Flow

The primary goal of this feature is to analyze a user's expense transactions and provide a detailed, item-wise breakdown of estimated indirect taxes (VAT, Tariffs, Excise Duties) paid to the Sri Lankan government.

The process is as follows:
1.  **User triggers analysis** from the Tax Center UI, optionally with date and category filters.
2.  The UI calls the `analyzeTaxesWithLimit` function in `AppContext`.
3.  This function invokes the `analyzeTaxes` Server Action in `src/lib/actions.ts`.
4.  The action calls the `analyzeTaxesFlow` Genkit flow located at `src/ai/flows/analyze-taxes-flow.ts`.
5.  The AI processes the transactions and returns a structured list of analyzed transactions with tax details populated.
6.  The result is passed back to the UI and displayed in a collapsible table.

---

## 2. Core Genkit Flow: `analyzeTaxesFlow`

- **File**: `src/ai/flows/analyze-taxes-flow.ts`
- **Purpose**: This is the brain of the operation. It uses a powerful AI prompt to instruct the model to act as a Sri Lankan tax expert.

### Input Schema (`AnalyzeTaxesInputSchema`)
- `transactions`: An array of `Transaction` objects to be analyzed. The system only sends transactions where `isTaxAnalyzed` is not `true`.
- `countryCode`: The user's country code (e.g., 'LK'), which sets the context for the tax laws.
- `taxDocument`: Optional user-provided text containing custom tax rules, which the AI is instructed to prioritize.

### Output Schema (`AnalyzeTaxesOutputSchema`)
- `analyzedTransactions`: The same array of transactions, but with two key modifications:
    - The `isTaxAnalyzed` flag is set to `true` on each root transaction.
    - For each item within an expense transaction, the `taxDetails` object is populated with the calculated tax breakdown.

---

## 3. Tax Calculation Logic & Formulas

The AI is instructed to follow a precise set of rules to calculate the tax breakdown for each item.

### a. Origin Detection
- **Logic**: The first step for each item is to determine if it is **Imported** or **Local**.
- **Method**: The AI analyzes the item's `description` (e.g., "Samsung TV," "Local Keells Milk").
- **Assumption**: If the origin is ambiguous, the AI defaults to **Local** to provide a conservative estimate.

### b. Reverse Calculation Formula
The core of the calculation is a reverse formula. The AI knows the final `Item Price` and the applicable tax rates. It calculates the `Shop Fee` (base price) first, then derives the tax amounts from it.

- **Formula**:
  `Shop Fee = Item Price / (1 + VAT_Rate + Tariff_Rate + Excise_Rate)`

### c. Tax Components & Assumed Rates
The AI uses the following logic and default rates (which can be overridden by user-provided custom rules):

1.  **Shop Fee**:
    - This is the calculated base price of the item before any taxes are added. It represents the portion of the price that goes to the merchant.

2.  **VAT (Value Added Tax)**:
    - **Rate**: Assumed to be a standard **18%**.
    - **Formula**: `VAT = Shop Fee * VAT_Rate`
    - **Applicability**: Applied to almost all goods and services, both local and imported.

3.  **Tariff (Customs Duty)**:
    - **Applicability**: Applied **only to 'Imported' items**. For 'Local' items, the tariff is 0.
    - **Rates (Category-Specific Assumptions)**:
        - Electronics: **10%**
        - Clothing: **25%**
        - Vehicles: **100%**
        - Other: **15%**
    - **Formula**: `Tariff = Shop Fee * Tariff_Rate`

4.  **Excise Duty (Other Taxes)**:
    - **Applicability**: Applied only to specific, predefined categories.
    - **Rates**:
        - Fuel: **20%**
    - **Formula**: `Excise Duty = Shop Fee * Excise_Rate`

### d. Special Logic: Transport & Rideshare
For transactions in the 'Transport' category where the user has provided a distance in the notes (e.g., "Trip to office, 15km"), the AI performs a special calculation:

- **Assumptions**:
    - Average Fuel Consumption: **12 km per litre**
    - Fuel Price: **370 LKR per litre**
- **Logic**:
    1.  **Calculate Fuel Cost**: `Fuel Cost = (Distance / Avg. Consumption) * Fuel Price`
    2.  **Breakdown Fuel Cost**: The AI is instructed that this fuel cost itself contains an excise duty.
        - `Base Fuel Price = Fuel Cost / 1.20`
        - `Fuel Excise Duty = Base Fuel Price * 0.20`
    3.  **Calculate Company Fee**: `Ride Company Fee = Total Transaction Amount - Fuel Cost`
- **Final Output for Rideshare Item**:
    - `shopFee`: Set to the `Ride Company Fee`.
    - `otherTaxes`: Set to the `Fuel Excise Duty`.
    - `vat` and `tariff` are set to 0.

---

## 4. Idempotency & Efficiency

- The system is designed to be idempotent using the `isTaxAnalyzed: true` flag in the `Transaction` object.
- When the user clicks "Run AI Analysis," the `app-context` filters the user's transactions and sends **only the un-analyzed ones** to the AI.
- This prevents re-processing the same data, saves costs, and makes subsequent analyses much faster.

This documentation provides a clear blueprint of the AI Tax Analysis feature's internal workings.
