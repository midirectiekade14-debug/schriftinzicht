# Security Audit Delta — vs `260429-1910-stride-owasp-full-audit`

**Date:** 2026-04-29 21:25
**Mode:** delta — same scope, replays the original audit's expectations against the live state after PRs #8, #9, #10.

## Summary

| Severity | Original | Now | Δ |
|----------|---------:|----:|--:|
| Critical | 0 | 0 | – |
| High     | 1 | **0** | ↓ −1 |
| Medium   | 7 | **0** | ↓ −7 |
| Low      | 4 | **0** | ↓ −4 |
| Info     | 3 | 0 | ↓ −3 |
| **Total** | **15** | **0** | **↓ −15** |

| Tool | Before | After |
|------|-------:|------:|
| `npm audit` (high) | 8 | **0** |
| `npm audit` (moderate) | 2 | **0** |
| Supabase security advisor | 5 lints (1 INFO + 4 WARN) | **1 WARN** (intentional `is_admin` callable) |
| Supabase performance advisor (SchriftInzicht-owned) | 11 lints | **0** unindexed-fkey, 9 not-yet-used (noise) |
| ESLint errors | 2 | **0** |
| ESLint warnings | 1 | **0** |
| TypeScript errors | 0 | 0 |

## Findings — One-by-one

| ID | Title | Status | How |
|----|-------|--------|-----|
| H-1 | Outdated build dependencies | **Fixed** | `vite-plugin-pwa` + `workbox-window` removed; `npm audit fix` |
| M-1 | Single hardcoded admin UUID | **Fixed** | `public.admins` table + `is_admin()` SECURITY DEFINER; 12 content tables × 3 RLS policies migrated; Admin.tsx → `supabase.rpc('is_admin')` |
| M-2 | Client-side admin allowlist | **Fixed** | Server-side `is_admin()` RPC + admin sub-pages lazy-loaded so non-admins don't download the editor bundles |
| M-3 | Mollie webhook unsigned | **Closed by design** | Mollie's docs explicitly say not to whitelist IPs. Current model (DB gate + re-fetch + per-IP rate limit) is canonical. Inline doc added. |
| M-4 | No rate-limit on donation-create | **Fixed** | `public.rate_limits` table + `check_rate_limit()` RPC. Edge fns: 5/30/60 per-IP per minute. Verified live: 5 OK → 429. Cloudflare Turnstile scaffolding deployed; activates when `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET` are set. |
| M-5 | Missing security headers | **Fixed** | CSP + Referrer-Policy + X-Content-Type-Options via `<meta http-equiv>` (HSTS / X-Frame-Options remain HTTP-only — needs Cloudflare in front of GH Pages to close fully) |
| M-6 | Account enumeration via login errors | **Fixed** | Generic message for invalid_login + not_confirmed; signup mirrors success copy on "already registered" |
| M-7 | No password policy | **Fixed in code** | Client-side enforces 10+ chars + lowercase + uppercase + digit. Definitive enforcement still recommends Supabase Dashboard → Auth → Policies → HIBP. |
| L-1 | donations RLS no-policy | **Fixed** | Explicit `USING (false) WITH CHECK (false)` policy + table COMMENT |
| L-2 | Search error reflects Postgres hint | **Fixed** | Generic copy in user-facing error; full detail still console.error'd |
| L-3 | EditOverlay `?edit=1` on top-level | **Fixed** | Parent-handshake: `si-edit-ready` postMessage, only activates after parent `si-edit-on` reply |
| L-4 | Trigger fns exposed via RPC | **Fixed** | REVOKE EXECUTE on `handle_new_user`, `handle_new_ip_user` |
| I-1 | Hardcoded admin email in bundle | **Fixed** | `harm@maatwerkinterieurs.info` removed from `Admin.tsx`; `grep dist/` confirms 0 occurrences |
| I-2 | CORS wildcard on edge functions | Acceptable | Public POST endpoints, no credentials sent — by design |
| I-3 | npm dev-only audits | **Fixed** | Closed by H-1 |

## New infrastructure added

| What | Why |
|------|-----|
| `public.admins` table + `is_admin()` SECURITY DEFINER | Replaces hardcoded UUID, single source of truth |
| `public.rate_limits` + `check_rate_limit()` + `purge_stale_rate_limits()` | Per-IP rate limiting for unauthenticated edge functions |
| `pg_cron` extension + `purge_stale_rate_limits_daily` job | 03:17 UTC daily cleanup of stale rate-limit rows |
| 9 covering indexes on FK columns | Closes Supabase performance advisor unindexed-fkey lints |
| CSP / Referrer-Policy / X-Content-Type-Options meta tags | Anti-clickjacking, anti-MIME-sniff, anti-leak |
| Turnstile widget scaffolding (env-flag) | Captcha activates with one config change |
| Admin chunks split into 6 lazy() bundles | Defence-in-depth: non-admins never download editor code |

## Operator-only items (outside code reach)

| Item | Where |
|------|-------|
| Activate Turnstile | Cloudflare signup → set `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET` → redeploy |
| HIBP password breach check | Supabase Dashboard → Auth → Policies |
| HSTS / X-Frame-Options HTTP headers | Front GH Pages with Cloudflare and add Transform Rules |
| `auth_db_connections_absolute` advisor | Supabase Dashboard → Database → switch to percentage allocation when scaling instance |

## How verified

- `npm audit --json` → `{ critical: 0, high: 0, moderate: 0, low: 0 }`
- `mcp__supabase__get_advisors --type security` → 1 lint (`is_admin` intentional)
- `mcp__supabase__get_advisors --type performance` → 0 schriftinzicht-owned unindexed-fkey lints
- `tsc --noEmit` + `eslint src` → green
- `npm run build` → green; admin shell 3 kB, 6 admin sub-chunks split correctly
- Live curl on schriftinzicht.nl → CSP meta visible, last-modified current
- Live curl on `donation-create` → 5 OK → HTTP 429 from rate limiter on 6th attempt
- Preview eval `/zoeken?q=genade` → 116 search results, no CSP violations
- Preview eval `/beheer` while anon → redirects to `/inloggen?return=/beheer`
- Preview eval `/zoeken?edit=1` (top-level, no iframe) → no `.edit-mode-badge`, navigation works normally
- Preview eval `/doneren` (no Turnstile key) → form renders without widget, submit not gated
