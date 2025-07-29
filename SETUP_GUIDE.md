## 🚀 Quick Start

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Create Environment File**

   ```bash
   cp env.example .env.local
   ```

3. **Configure Environment Variables**
   Edit `.env.local` with your actual values:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # Optional: Server-side Supabase key (for admin operations)
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # Google OAuth Configuration (for future implementation)
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here

   # Next.js Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_here

   # Development Configuration
   NODE_ENV=development
   ```

4. **Run Development Server**
   ```bash
   pnpm dev
   ```

## 🔧 Supabase Setup

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Note down your project URL and anon key

### 2. Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  typ_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-projects', 'user-projects', false);

-- Storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Authentication Setup

1. Go to Authentication → Settings
2. Configure your site URL: `http://localhost:3000`
3. Add redirect URLs: `http://localhost:3000/dashboard`

### 4. Google OAuth (Optional)

1. Go to Authentication → Providers
2. Enable Google provider
3. Add your Google Client ID and Secret

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
```

### Key Technologies

- **Frontend**: Next.js 15.3.5, React 19.0.0, TypeScript
- **Styling**: Tailwind CSS v4, Shadcn UI
- **Backend**: Supabase (Auth, Database, Storage)
- **Editor**: CodeMirror 6 with Typst syntax highlighting
- **Compiler**: @myriaddreamin/typst-all-in-one.ts

### Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (optional)
- [ ] `GOOGLE_CLIENT_ID` (optional)
- [ ] `GOOGLE_CLIENT_SECRET` (optional)
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
