# Clerkfolio

A UK doctor and medical-student portfolio app: track clinical entries, cases,
reflections, evidence, specialty-application scoring, ARCP capabilities, and
recruitment deadlines, then export or share a polished portfolio.

Live site: <https://clerkfolio.co.uk>

## Stack

- **Next.js** App Router (webpack build), **React 19**, strict **TypeScript**, **Tailwind CSS**
- **Supabase** (Postgres + Auth + Storage, SSR/JS) with row-level security
- **Stripe** (subscriptions), **Resend** (email), **Sentry** (monitoring), Vercel Analytics
- Upstash-backed rate limiting; `@react-pdf/renderer` / `pdf-lib` / `jszip` for exports
- Node engine: `24.x`

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # or: npm run build && npm run start
```

Environment variables are documented in [`.env.example`](.env.example) (Supabase
keys, Resend, Stripe, Sentry, Upstash, cron/share secrets). The app runs with
degraded-but-safe fallbacks when optional services (Upstash, Sentry) are absent.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (main compile gate) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `app/`, `components/`, `lib/` |
| `npm run test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end tests (self-skips without secrets) |
| `npm run scan:secrets` | Secret scan of staged files (pre-commit hook) |
| `npm run scan:secrets:all` | Secret scan of every tracked file |

The pre-merge gate is all four of: `typecheck`, `lint`, `build`, `test` (Next's
build no longer runs ESLint, so `lint` and `build` are both required).

## Deployment

Hosted on Vercel. **Pushing `main` deploys production.** Prefer a branch +
Vercel preview + review before merging. Database changes are additive,
backward-compatible SQL migrations under [`supabase/migrations/`](supabase/migrations)
coordinated with the deploy (one shared Supabase project, no preview DB).

## Deeper docs

[`CLAUDE.md`](CLAUDE.md) is the detailed, maintained architecture map (auth,
entitlements, sharing, uploads, exports, specialties, theming, security
patterns, and known gotchas). Treat it as the source of truth over this README.
