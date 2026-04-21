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

## Backups

1. Supabase:
   1. Go to current project.
   2. Go to `Storage > Configuration > S3 > New Access Key` and copy the Key ID and Secret.
   3. Copy the Endpoint URL from the same page.
   4. On GitHub, go to `Repository settings > Secrets and variables > Actions`.
   5. Add these Repository Secrets:

      ```text
      SUPABASE_S3_ENDPOINT
      SUPABASE_S3_KEY
      SUPABASE_S3_SECRET
      ```

   6. In the current project, click `Connect` in the top bar, then `Direct Connection String > Session Pooler`, copy the URL, and add it to Repository Secrets as `SUPABASE_DB_URL`.

2. AWS (Assuming you have added `SUPABASE_DB_URL` AND `SUPABASE-*` variables into repository secret):
   1. Create a bucket:

      ```bash
      aws s3api create-bucket \
      --bucket typst-backup \
      --region ap-south-1 \
      --create-bucket-configuration LocationConstraint=ap-south-1
      ```

   2. Add bucket lifecycle policy (to delete objects older than 30 days):

      ```json
      {
        "Rules": [
          {
            "ID": "DeleteOldObjects",
            "Filter": {},
            "Status": "Enabled",
            "Expiration": {
              "Days": 30
            }
          }
        ]
      }
      ```

      Save it as `lifecycle.json` and run:

      ```bash
      aws s3api put-bucket-lifecycle-configuration \
        --bucket typst-backup \
        --lifecycle-configuration file://lifecycle.json \
        --region ap-south-1
      ```

   3. Create an OIDC provider:

      ```bash
      aws iam create-open-id-connect-provider \
      --url "https://token.actions.githubusercontent.com" \
      --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
      --client-id-list "sts.amazonaws.com"
      ```

   4. Save the following policy as `policy.json` (replace federated field with output from previous command):

      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Federated": "<arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com>"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
              "StringLike": {
                "token.actions.githubusercontent.com:sub": "repo:infocusp-fullstack/typst:*"
              },
              "StringEquals": {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
              }
            }
          }
        ]
      }
      ```

   5. Create the role:

      ```bash
      aws iam create-role \
      --role-name GitHubAction-AssumeRoleWithAction \
      --assume-role-policy-document file://policy.json
      ```
      then copy the role ARN and store it in GitHub Secrets as:

      ```text
      AWS_ROLE_ARN
      ```
   6. Attach S3 policy:

      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "RcloneAccess",
            "Effect": "Allow",
            "Action": [
              "s3:PutObject",
              "s3:ListBucket",
              "s3:GetObject"
            ],
            "Resource": [
              "arn:aws:s3:::typst-backup",
              "arn:aws:s3:::typst-backup/*"
            ]
          }
        ]
      }
      ```

      ```bash
      aws iam put-role-policy \
      --role-name GitHubAction-AssumeRoleWithAction \
      --policy-name RcloneAccessPolicy \
      --policy-document file://s3-policy.json
      ```

   7. Add the bucket name you created to Repository Secrets (`typst-backup` if you used step 1):

      ```text
      AWS_BUCKET_NAME
      ```
