# Roarline

Live scores, match rooms and fan conversation in one place.

## Brand assets

The active product name and reusable asset paths live in
`public/brand/brand.js`. The default mark is the Signal R.

- Horizontal logo: `public/brand/roarline-logo-horizontal.svg`
- Compact mark: `public/brand/roarline-icon.svg`
- Monochrome logo: `public/brand/roarline-logo-mono.svg`
- App icon: `public/brand/roarline-app-icon.svg`
- Alternate B: `public/brand/roarline-logo-b-stadium-speech.svg`
- Alternate C: `public/brand/roarline-logo-c-ticker-wave.svg`

To replace the logo later, keep these filenames or update the paths in
`public/brand/brand.js` and the corresponding `<img>` references in
`public/index.html` and `public/admin.html`.

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
git commit -m "Deploy Roarline"
git push origin main
```

GitHub Actions deploys the site automatically.
