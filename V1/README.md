<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1DtCTjORf3598XuhJa8AHhWk2ZC9u-h83

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### Database Verification

The application connects to a Neon PostgreSQL database.
- **Test Connection**: Run `node scripts/test-db.js` to verify your database connection.
- **Local API**: To run the backend API locally (files in `api/`), use `vercel dev` instead of `npm run dev` if you have Vercel CLI installed. Regular `npm run dev` (Vite) does not serve the Vercel Serverless Functions in `api/`.

