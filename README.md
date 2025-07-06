# FiscalFlow - A Firebase Studio Project

This is a full-stack personal finance application called **FiscalFlow**, built inside Firebase Studio. It features a Next.js frontend, Firebase backend, and integrated AI capabilities with Genkit.

This README provides a brief overview. For more detailed information, please refer to the comprehensive documentation included in this project:

*   **[User Guide (features.md)](./features.md):** A detailed walkthrough of all application features from an end-user perspective.
*   **[Technical Documentation (technical.md)](./technical.md):** An in-depth guide to the project's architecture, data models, AI integration, and core logic.
*   **[QA Test Plan (QA_TEST_PLAN.md)](./QA_TEST_PLAN.md):** A complete set of test cases to ensure application quality and correctness.

## Getting Started

To run the application locally, you can use the command:

```bash
npm run dev
```

The application's main entry point is `src/app/page.tsx`, which contains the login form. After authenticating, users are redirected to the main dashboard at `/dashboard`.
