# Insta Payroll

Restaurant payroll management built with Next.js, Prisma, and Supabase Auth.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with required variables (see "Environment Variables" below).

3. Apply database migrations:

```bash
npx prisma migrate deploy
```

4. Start dev server:

```bash
npm run dev
```

## Environment Variables

Set these in local `.env.local` and in Vercel Project Settings:

- `DATABASE_URL` - Postgres connection string used by app runtime (Prisma adapter/pg).
- `DIRECT_URL` - direct Postgres connection for Prisma CLI migrations (recommended).
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server only).
- `NEXT_PUBLIC_SITE_URL` - public site URL (for auth redirect safety and docs consistency).

## Deploy on Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Configure all environment variables above.
4. Set build command to:

```bash
npm run vercel-build
```

5. Deploy.

### Supabase Auth Configuration (Required)

In Supabase Dashboard -> Authentication -> URL Configuration:

- Set **Site URL** to your production URL (for example `https://your-app.vercel.app`).
- Add **Redirect URLs** for all environments:
  - `http://localhost:3000/**`
  - `https://your-app.vercel.app/**`
  - `https://your-custom-domain.com/**` (if using a custom domain)
  - `https://*.vercel.app/**` (optional for preview deployments)

This is required for password reset flow:

- `/forgot-password`
- `/auth/callback`
- `/auth/reset-password`

## Useful Commands

```bash
npm run build
npm run lint
npm run seed
```
