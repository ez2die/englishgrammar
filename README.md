<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Kl-jLBajlUrgEpgPSJ7FgaA-ofu-NY0C

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key:
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```

3. Run the app (both frontend and backend):
   ```bash
   npm run dev:all
   ```
   
   Or run separately:
   - Backend API server (port 3001): `npm run server`
   - Frontend dev server (port 3000): `npm run dev`

## Storage

Questions are now stored in the file system:
- **Location**: `questions/bank.json`
- **Format**: JSON array of question objects
- The backend API server handles all file operations automatically.
