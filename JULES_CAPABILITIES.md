# Jules Capabilities on FinPulse Pro

I am Jules, an advanced AI software engineer. Based on my analysis of this repository (`finpulse-pro---advanced-financial-analysis`), here is what I can do for you:

## 1. Frontend Development (React & Vite)
- **Component Development**: I can create, modify, and optimize React components in `src/components/` and `src/App.tsx`.
- **State Management**: I can help manage application state, hooks, and context.
- **Data Visualization**: I can create and update charts using `recharts` to visualize financial data.
- **Data Processing**: I can assist with parsing CSV and Excel files using `csv-parser` and `xlsx`.
- **Styling**: I can work with CSS and styling libraries to improve the UI/UX.

## 2. Backend Development (Vercel Serverless Functions)
- **API Endpoints**: I can create and modify serverless functions in the `api/` directory (e.g., `api/users.ts`, `api/expenses.ts`).
- **Logic Implementation**: I can implement complex business logic on the server side.
- **Optimization**: I noticed that `api/crud.ts` creates a new database pool on every request. I can refactor this to use the shared pool from `api/db.ts` for better performance.

## 3. Database Management (PostgreSQL)
- **Query Optimization**: I can write efficient SQL queries using `pg`.
- **Schema Management**: I can help design and modify database schemas.
- **CRUD Operations**: I can extend or debug the generic CRUD handler in `api/crud.ts` or specific entity handlers.
- **Data Integrity**: I can help ensure data consistency and proper error handling.

## 4. AI Integration (Gemini API)
- **Generative AI Features**: I can help integrate Google's Gemini API (`@google/genai`) to add AI-powered financial analysis or other features.
- **Prompt Engineering**: I can assist in crafting effective prompts for the AI model.

## 5. General Engineering Tasks
- **Testing**: I can set up and write unit and integration tests to ensure code reliability.
- **Debugging**: I can analyze error logs and code to find and fix bugs.
- **Documentation**: I can improve documentation, like this file or `README.md`.
- **Code Review**: I can review code for best practices, security, and performance.

## How to Work with Me
You can ask me to perform any of the tasks above. For example:
- "Jules, create a new chart component for monthly expenses."
- "Jules, fix the database connection issue in `api/crud.ts`."
- "Jules, add a test for the user login API."

I operate within a secure sandbox environment and can propose changes to your codebase. Once you approve my plan, I will implement the changes and verify them.
