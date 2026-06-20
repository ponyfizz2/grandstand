# Grandstand

Live sports scores, standings and game-day social chat.

## Architecture

- **Hosting:** GitHub Pages
- **Deployment:** GitHub Actions on every push to `main`
- **Authentication/database/realtime chat:** Supabase
- **Shared ESPN score collection:** Supabase Edge Function
- **Netlify:** not used

## Live competitions

NRL, AFL, Super Rugby, FIFA World Cup, NFL, NBA, MLB, NHL and MLS.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

The app uses Supabase project `nxqxboepctqiowtgjkgn`.

Run these SQL files in Supabase SQL Editor:

1. `supabase-schema.sql`
2. `supabase-v17-chat-fix.sql`
3. `supabase-github-pages-migration.sql`

Deploy the shared live-score function:

```bash
supabase login
supabase link --project-ref nxqxboepctqiowtgjkgn
supabase functions deploy live-scores --no-verify-jwt
```

The public function URL is:

```text
https://nxqxboepctqiowtgjkgn.supabase.co/functions/v1/live-scores
```

## Authentication URLs

In Supabase Dashboard, open **Authentication → URL Configuration**.

Set Site URL:

```text
https://ponyfizz2.github.io/grandstand/
```

Add Redirect URL:

```text
https://ponyfizz2.github.io/grandstand/
```

The Google Cloud OAuth callback remains:

```text
https://nxqxboepctqiowtgjkgn.supabase.co/auth/v1/callback
```

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `public` folder.
GitHub Pages must be configured to use **GitHub Actions** as its source.

The production site is:

```text
https://ponyfizz2.github.io/grandstand/
```

## Deployment

Commit and push to `main`:

```bash
git add .
git commit -m "Deploy Grandstand"
git push origin main
```

GitHub Actions deploys the site automatically.
