# Deploying Memoalive to Vercel

This guide takes the app from your local machine to a live public URL in about 15 minutes.
Vercel is the recommended host — it's made by the same team as Next.js and has a generous free tier.

---

## Step 1 — Push the code to GitHub

Vercel deploys directly from a GitHub repository.

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click **New repository**, name it `memoalive`, set it to **Private**, and click **Create repository**.
3. In your terminal, from the `Memoalive` folder on your Desktop:

```bash
cd ~/Desktop/Memoalive
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/memoalive.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New → Project**.
3. Find the `memoalive` repository and click **Import**.
4. Under **Root Directory**, type `app` and press Enter.  
   (The Next.js app lives inside the `app/` subfolder.)
5. Expand **Environment Variables** and add these four values:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | Leave blank for now — fill in after deploy |

6. Click **Deploy**. Vercel will build the app (takes about 2 minutes).
7. Once it finishes, copy your new URL — it looks like `https://memoalive-abc123.vercel.app`.

---

## Step 3 — Set your live URL

Now that you have the live URL, update one environment variable:

1. In Vercel → your project → **Settings → Environment Variables**.
2. Edit `NEXT_PUBLIC_APP_URL` and set it to your Vercel URL (e.g. `https://memoalive-abc123.vercel.app`).
3. Go to **Deployments** and click **Redeploy** on the latest deployment to pick up the change.

---

## Step 4 — Update Supabase auth settings

Supabase needs to know your live URL so sign-in redirects work correctly.

1. In your Supabase project, go to **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL: `https://memoalive-abc123.vercel.app`
3. Under **Redirect URLs**, add: `https://memoalive-abc123.vercel.app/**`
4. Click **Save**.

---

## Step 5 — Verify

Open your Vercel URL in a browser. You should be able to:
- Sign up for a new account
- Create an event and add a memory
- Create and share a scrapbook publicly via `/s/[token]`

---

## Custom domain (optional)

To use your own domain (e.g. `memoalive.com`):

1. Vercel → your project → **Settings → Domains**.
2. Add your domain and follow the DNS instructions.
3. Once verified, update `NEXT_PUBLIC_APP_URL` and the Supabase redirect URLs to your custom domain.

---

## Keeping the app up to date

Every time you push new code to the `main` branch on GitHub, Vercel will automatically rebuild and redeploy the app within about 2 minutes.

```bash
git add .
git commit -m "Your change description"
git push
```

---

## Environment variable quick reference

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role ⚠️ keep secret |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (after deploy) |
