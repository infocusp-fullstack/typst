# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Typst Resume is a Next.js 15 web application for creating and managing resumes using the Typst document system. It features a live editor with CodeMirror, Google OAuth authentication via Supabase, and PDF export capabilities.

## Commands

```bash
pnpm dev      # Start development server at http://localhost:3000
pnpm build    # Build for production (runs copy-pdf-worker script first)
pnpm start    # Start production server
pnpm lint     # Run ESLint
pnpm format   # Format code with Prettier
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Editor**: CodeMirror 6
- **Database/Auth**: Supabase (PostgreSQL, Auth, Storage)
- **Document Rendering**: @myriaddreamin/typst-all-in-one.ts
- **Package Manager**: pnpm

## Architecture

```
src/app/           # Next.js App Router pages
  dashboard/     # User dashboard
  editor/        # Resume editor with CodeMirror
  login/         # Authentication page

src/components/   # React components (ui/, editor/, dashboard/)
src/hooks/        # Custom React hooks
src/lib/          # Utilities (supabase client, utils)
src/types/       # TypeScript type definitions

db_setup/         # Supabase SQL setup files
scripts/          # Build scripts (copy-pdf-worker.js)
```

## Database Setup

Supabase setup requires running SQL files in sequence from `db_setup/`:
1. tables_setup
2. tables_policies
3. storage_buckets_policies
4. create_templates

Environment variables in `.env` (copy from `env.example`):
- Supabase credentials (URL, anon key, service role key)
- Google OAuth credentials (client ID, secret)

# Next.js: ALWAYS read docs before coding

Before any Next.js work, fetch the relevant docs from nextjs.org/docs/app. Your training data is outdated — the official docs are the source of truth. Use the WebFetch tool to read docs from https://nextjs.org/docs/app. The project runs Next.js 15, but Next.js no longer hosts version-specific docs — the current App Router docs are the authoritative reference. Do NOT look for docs in `node_modules/next/dist/docs/` as Next.js does not ship offline documentation there.