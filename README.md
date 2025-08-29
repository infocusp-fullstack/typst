# Typst Resume Setup Guide

## Getting Started 💻

1. Create supabase account, create new organization and a project
2. Go to SQL Editor and Run commands from the db_setup in given sequence
   1. Run `tables_setup`, `tables_policies`, `storage_buckets_policies`
   1. Upload `basic-resume.typ` on `user-projects` bucket in folder `templates/resume/`
   1. Upload `basic-resume.png` on `thumbanils` bucket in folder `templates/basic-resume.png`
   1. Run `create_templates.sql` from db_setup
3. Create new OAuth 2.0 Client from your google console
   1. Choose Application Type: Web Application
   2. Add Authorized Javascript origin: `http://localhost:3000`
   3. Add Authorized redirect URIs: `http://localhost:3000/api/auth/google`
   4. You will be given ClientId and ClientSecret in the next step, copy this for next steps
4. Setup Google Auth in Supabase
   1. Visit Authentication/Sign In Providers and enable Google
   2. Copy callback url from the page, and register it in your google-console client setup
   3. Put ClientId, Secret that you created in previous step and Save
   4. Visit Authentication/URL Configuration `/auth/url-configuration` and add these to redirect URLs - `http://localhost:3000`, `http://localhost:3000/dashboard`
5. Create .env by copying content from the .env.example. Populate content with your config settings
6. Run `pnpm install` and `pnpm dev`
7. Visit `http://localhost:3000/login`

The application will automatically redirect you to login if not authenticated, or to the dashboard if you're already signed in.
