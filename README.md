# Setup Guide

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed
- [Supabase](https://supabase.com/) account
- [Google Cloud Console](https://console.cloud.google.com/) access for OAuth setup

## 🛠️ Getting Started

1. Create supabase account, create new organization and a project
2. Go to SQL Editor in Supabase and Run commands from the db_setup in given sequence
   1. Run `tables_setup`, `tables_policies`, `storage_buckets_policies`
   1. Upload `basic-resume.typ` on `user-projects` bucket in folder `templates/resume/`
   1. Upload `basic-resume.png` on `thumbanils` bucket in folder `templates/basic-resume.png`
   1. Run `create_templates.sql` from db_setup
3. Create new OAuth 2.0 Client from your google console
   1. Choose Application Type: Web Application
   2. Add Authorized Javascript origin: `http://localhost:3000`
   3. Add Authorized redirect URIs: `http://localhost:3000/api/auth/google`
   4. Copy the generated **Client ID** and **Client Secret**.
4. Setup Google Auth in Supabase
   1. In Supabase Dashboard → **Authentication → Providers → Google**, enable Google sign-in
   2. Put ClientId, Secret that you created in previous step and Save
   3. Copy callback URL from the screen and add it your [Google client setup](https://console.cloud.google.com/)
   4. Under **Authentication → URL Configuration**, add redirect URLs:

      ```
      http://localhost:3000
      http://localhost:3000/dashboard
      ```

5. Create .env by copying content from the `env.example`. Populate content with your new settings

   ```bash
   cp env.example .env
   ```

6. Run `pnpm install` and `pnpm dev`
7. Visit `http://localhost:3000/login`

The application will automatically redirect you to login if not authenticated, or to the dashboard if you're already signed in.

## 🧪 E2E Testing with Playwright

Before running the tests, you must manually generate the required authentication state files (`cxo-user.json` and/or `regular-user.json`) so Playwright can bypass the login screen.

1. Log in to the application at `http://localhost:3000` via Google OAuth.
2. Open your browser's Developer Tools and navigate to the **Console** tab.
3. Run the following snippet to generate the Playwright storage state JSON and copy it to your clipboard:

   ```javascript
   const tokenKey = Object.keys(localStorage).find(key => key.endsWith('-auth-token'));
   const authJson = {
     cookies: [],
     origins: [{
       origin: "http://localhost:3000",
       localStorage: [{ name: tokenKey, value: localStorage.getItem(tokenKey) }]
     }]
   };
   copy(JSON.stringify(authJson, null, 2));
   console.log("Storage state copied to clipboard!");
   ```

4. Create the `tests/.auth` directory if it doesn't exist:

   ```bash
   mkdir -p tests/.auth
   ```

5. Make a new file mapping to the correct role you want to run tests as:
   - For CXO users, save the clipboard content into `tests/.auth/cxo-user.json`.
   - For regular users, save the clipboard content into `tests/.auth/regular-user.json`.

6. Run the E2E tests:

   ```bash
   pnpm test:e2e
   # or with the Playwright UI
   pnpm test:e2e:ui
   ```
