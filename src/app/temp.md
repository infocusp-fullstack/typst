# 🚀 Typst Resume Setup Guide

This project helps you build and manage resumes using **Typst** with Supabase for storage and authentication.

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed
- [Supabase](https://supabase.com/) account
- [Google Cloud Console](https://console.cloud.google.com/) access for OAuth setup

---

## 🛠️ Getting Started

### 1. Create a Supabase Project

1. Sign up at [Supabase](https://supabase.com/).
2. Create a **new organization** and then a **new project**.

---

### 2. Database Setup

Go to **SQL Editor** in Supabase and run the SQL scripts from the `db_setup` folder in the following order:

1. `tables_setup.sql` – creates required tables.
2. `tables_policies.sql` – adds row-level security policies.
3. `storage_buckets_policies.sql` – configures storage access.

---

### 3. Upload Templates & Assets

1. Upload `basic-resume.typ` to the **`user-projects`** bucket under:
2. Upload the thumbnail `basic-resume.png` to the **`thumbnails`** bucket under:
3. Run `create_templates.sql` from the `db_setup` folder to register template metadata.

---

### 4. Configure Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/), create a new **OAuth 2.0 Client**:

- **Application Type:** Web Application
- **Authorized JavaScript origins:**
  ```
  http://localhost:3000
  ```
- **Authorized redirect URIs:**
  ```
  http://localhost:3000/api/auth/callback/google
  ```

2. Copy the generated **Client ID** and **Client Secret**.

---

### 5. Enable Google Auth in Supabase

1. In Supabase Dashboard → **Authentication → Providers → Google**, enable Google sign-in.
2. Enter the **Client ID** and **Client Secret** from the previous step.
3. Copy callback URL from the screen and add it your [Google client setup](https://console.cloud.google.com/)
4. Under **Authentication → URL Configuration**, add redirect URLs:
   ```
   http://localhost:3000
   http://localhost:3000/dashboard
   ```

---

### 6. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

### 7. Run the Application

```bash
pnpm install
pnpm dev
```
