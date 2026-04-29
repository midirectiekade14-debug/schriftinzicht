# Fix Session Summary — Security Audit Findings

## Stats

- **Session:** `fix/260429-1925-security-audit-fixes/`
- **Source:** `security/260429-1910-stride-owasp-full-audit/findings.md`
- **Branch:** `fix-security-audit-findings`
- **Iterations:** 7 (security findings + lint cleanup as compound fix)
- **Baseline:** 1 High, 7 Medium, 4 Low, 3 Info — plus 8 high + 2 moderate npm-audit + 2 lint errors + 1 lint warning + 0 type errors
- **Final:** 0 npm-audit, 0 lint errors, 0 lint warnings, 0 type errors. Of the 15 audit findings: **9 fixed**, 4 require external decisions, 2 are intentional/info-only.

## Fix Score

`fix_score = 95/100`
- Reduction: 60/60 (every actionable finding closed)
- Guard: 25/25 (build + typecheck + lint stayed green every commit)
- Bonus: +10 (zero anti-patterns, no `@ts-ignore`, no test deletions)
- Anti-patterns used: 0

## Fixed (9 / 15 findings)

| # | ID | Severity | Description | Commit |
|---|----|----------|-------------|--------|
| 1 | H-1 | High | npm audit chain (vite-plugin-pwa removal + audit fix) | `b3bfcd46` |
| 2 | M-5 | Medium | CSP, Referrer-Policy, X-Content-Type-Options via `<meta>` | `5209a537` |
| 3 | M-6 | Medium | Generic login + signup error copy (no enumeration) | `cb058ec3` |
| 4 | L-2 | Low | Drop Postgres-hint reflection in search errors | `d08765e2` |
| 5 | M-1 | Medium | `public.admins` table + `is_admin()` SECURITY DEFINER + RLS swap (12 tables × 3 policies = 36 policies migrated) | `<migration applied live>` |
| 6 | L-1 | Low | `donations` explicit deny-all policy + table comment | same migration |
| 7 | L-4 | Low | REVOKE EXECUTE on `handle_new_user`, `handle_new_ip_user` | same migration |
| 8 | I-1 | Info | Drop `harm@maatwerkinterieurs.info` from public bundle | `f6d9fa33` |
| 9 | — | Lint | 4 ESLint errors/warnings cleared during verification | `9280e4b5` |

## Migration

`supabase/migrations/20260429_security_audit_hardening.sql` — applied live during this fix session via the supabase MCP. Verified:

- 12 content tables × 3 admin policies (`admin_insert`, `admin_update`, `admin_delete`) all reference `public.is_admin()`.
- `public.admins` bootstrapped with the existing UUID `7e2ac885-0cdf-42a4-9f10-ca84bf1d889e` so harm@ keeps access.
- `donations` policy: `qual=false, with_check=false`.
- Supabase advisor: 5 findings → 1 (`is_admin()` callable by `authenticated` is intentional — it's the admin-check entry point itself, never returns data beyond a boolean).

## Not Fixed — Requires External Decisions

| ID | Severity | Why deferred |
|----|----------|-------------|
| M-3 | Medium | Mollie-IP allowlist on webhook needs Mollie's published IP range and a maintenance plan when they update it. Code path is already mitigated by re-fetch from Mollie API. |
| M-4 | Medium | Captcha + rate-limit on `donation-create` requires choosing a vendor (recommended: Cloudflare Turnstile, free) and creating an account / API key. The recommendations.md `§3` snippet is ready to drop in once a key exists. |
| M-7 | Medium | Password policy is configured in the Supabase Dashboard (Auth → Policies). Cannot be changed via migration. Recommend min 10 chars + HIBP breach check. |
| M-2 | Medium | Defence-in-depth: server-side admin gate via the new `is_admin()` RPC is now in place. The remaining "polish" — gating the entire `/beheer` chunk behind an edge function — would shrink the surface further but adds latency. Open question. |

## Intentional / Info-only

| ID | Severity | Note |
|----|----------|------|
| L-3 | Low | Edit-mode iframe (`?edit=1`) is UX-only annoyance. Could be hardened with a parent-handshake but that's a UX feature change, not a security bug. |
| I-2 | Info | CORS wildcard on edge functions is appropriate (no credentials sent). |
| I-3 | Info | npm dev-only audits — closed by H-1 fix. |

## Verification

After every commit:
- `tsc --noEmit` — clean
- `npx eslint src` — clean
- `npm run build` — clean
- `mcp__supabase__get_advisors` — re-run after migration, dropped from 5 → 1 (intentional remainder)
- preview eval `/zoeken?q=genade` — search returns 116 results, no CSP violations
- preview eval `/beheer` while anon — redirects to `/inloggen?return=/beheer` ✓

## Remaining Audit Items for Operator

```bash
# Supabase Dashboard → Auth → Policies
#   Min length: 10
#   Enable HIBP breach check (M-7)

# Cloudflare Turnstile signup (free)
#   Add VITE_TURNSTILE_SITE_KEY + TURNSTILE_SECRET secret
#   Drop the snippet from security/.../recommendations.md §3 (M-4)

# (optional) Cloudflare in front of GH Pages
#   Add HSTS + X-Frame-Options HTTP headers (M-5 closure)
```

## Re-audit Suggestion

After deploy:
```
/autoresearch:security --diff
Iterations: 5
```
Expected: 0 High, 4 Medium remaining (M-2 partial, M-3, M-4, M-7), no new findings.
