<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1iUB_-O-QH_4wgfbX8kBVOdHW8Efl4Tz3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

> [!IMPORTANT]
> **Migration Note:** If you moved this project folder to a new location, the Python virtual environment in the `server` folder will have broken paths. To fix this, delete `server/venv` and run `npm run server:install` before running the backend locally.
