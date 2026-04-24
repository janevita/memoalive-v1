# Memoalive — Getting Started

This guide takes you from zero to a running local Memoalive app in about 10 minutes.

---

## What you need

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **A Supabase account** — free tier is plenty: [supabase.com](https://supabase.com)

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or sign up — it's free).
2. Click **New project** and give it a name, e.g. `memoalive`.
3. Choose a region close to you and set a database password (save it somewhere safe).
4. Wait ~1 minute for the project to spin up.

---

## Step 2 — Run the database migration

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase/migrations/apply_pending.sql` from this repo.
4. Paste the entire contents into the SQL editor.
5. Click **Run** (or press `Cmd+Enter`).

You should see "Success. No rows returned." — that means all tables, triggers, and policies were created.

> **What this creates:** All Memoalive tables (profiles, events, memories, media, reactions, comments, scrapbooks, upload sessions, and more), Row Level Security policies so users can only see data they belong to, and a trigger that automatically creates a profile whenever someone signs up.

---

## Step 3 — Enable email auth

1. In Supabase, go to **Authentication → Providers**.
2. **Email** should already be enabled. If not, toggle it on.
3. For local development, go to **Authentication → Settings** and set **Site URL** to `http://localhost:3000`.
4. Optionally, disable **Confirm email** (under Email settings) so you can sign up without checking your inbox during testing.

---

## Step 4 — Get your API keys

1. In Supabase, go to **Settings → API** (in the left sidebar).
2. Copy three values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — the long JWT string under "Project API keys"
   - **service_role** key — also under "Project API keys" (keep this secret — never expose it in the browser)

---

## Step 5 — Configure environment variables

In the `app/` folder of this repo:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Replace the placeholder values with what you copied in Step 4. The `SUPABASE_SERVICE_ROLE_KEY` is used server-side only (for the phone photo upload API route) and is never sent to the browser.

---

## Step 6 — Install dependencies and start

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the Memoalive home page. Click **Sign up** to create your first account and start adding memories.

---

## Troubleshooting

**"Invalid API key" or blank page after sign-in**
Double-check your `.env.local` values — make sure there are no extra spaces or quotes around the key.

**"relation 'profiles' does not exist"**
The migration didn't run. Go back to Step 2 and run the SQL again. Check for any red error messages in the SQL editor.

**Emails not arriving for confirmation**
Disable email confirmation in Supabase → Authentication → Settings → Disable email confirmations. This is fine for local development.

**Port already in use**
Next.js will automatically try the next port (3001, 3002…). Check the terminal output for the actual URL.

---

## Generating typed Supabase client (optional)

The codebase currently uses `any`-typed Supabase clients with manual type assertions. Once you have a live project, you can replace the hand-written types with auto-generated ones:

```bash
npx supabase login
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > app/src/lib/supabase/database.types.ts
```

Then change both `createServerClient<any>` and `createBrowserClient<any>` calls to `createServerClient<Database>` and `createBrowserClient<Database>`. This gives you full end-to-end type safety.

---

## Project structure

```
Memoalive/
├── app/                        Next.js 14 app
│   ├── src/
│   │   ├── app/                Routes (App Router)
│   │   │   ├── (auth)/         Login + signup pages
│   │   │   ├── (main)/         Dashboard, events, memories, scrapbooks, search, profile
│   │   │   │   └── scrapbooks/
│   │   │   │       ├── page.tsx          Scrapbook list
│   │   │   │       └── [id]/page.tsx     Scrapbook canvas editor
│   │   │   ├── s/[token]/       Public scrapbook share view (no login required)
│   │   │   ├── m/[token]/       Mobile photo upload page (QR code target)
│   │   │   └── api/upload/[token]/  Server route — handles phone photo uploads
│   │   ├── components/         Shared UI components
│   │   │   └── scrapbook/      Scrapbook canvas + photo picker + frame tools
│   │   └── lib/
│   │       ├── actions/        Server actions (auth, events, memories, upload sessions)
│   │       ├── data/           Data fetching functions
│   │       └── supabase/       Client factories + database types
│   └── .env.local              Your local credentials (never commit this)
└── supabase/
    └── migrations/             SQL migration files (apply_pending.sql runs them all)
```
