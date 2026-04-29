# OWASP Top 10 Coverage Matrix

| ID | Category | Tested | Findings | Status |
|----|---|:-:|:-:|---|
| A01 | Broken Access Control | ✓ | 2 (M-1, M-2) | ⚠️ Issues |
| A02 | Cryptographic Failures | ✓ | 0 | ✅ Clean (anon key intentional, secrets in vault) |
| A03 | Injection | ✓ | 0 | ✅ Clean (parameterized queries, no `dangerouslySetInnerHTML`) |
| A04 | Insecure Design | ✓ | 2 (M-4, L-3) | ⚠️ Issues |
| A05 | Security Misconfiguration | ✓ | 3 (M-5, L-1, L-4) | ⚠️ Issues |
| A06 | Vulnerable Components | ✓ | 1 (H-1) | ⚠️ Issues |
| A07 | Auth Failures | ✓ | 2 (M-6, M-7) | ⚠️ Issues |
| A08 | Software & Data Integrity Failures | ✓ | 1 (M-3) | ⚠️ Issues |
| A09 | Logging & Monitoring Failures | ✓ | 1 (L-2) | ⚠️ Issues |
| A10 | Server-Side Request Forgery | ✓ | 0 | ✅ Clean (Mollie URL is fixed) |

**Coverage:** 10/10 categories tested.

## Per-Category Detail

### A01 — Broken Access Control
- ✅ IDOR on `:id` / `:authorId` / `:slug` routes — all use `.eq('id', :id)` with RLS-public-read content tables, no horizontal escalation possible.
- ✅ Authorization middleware on protected routes (`/beheer` redirects via `useAuth` + RLS).
- ⚠️ Single-UUID admin policy (M-1).
- ⚠️ Client-side admin allowlist (M-2).
- ✅ Directory traversal — N/A (static SPA, no file ops).
- ✅ CORS — `*` is intentional for static + public edge fns.

### A02 — Cryptographic Failures
- ✅ Passwords hashed by Supabase (bcrypt).
- ✅ No hardcoded secrets in `web/src` (only `VITE_SUPABASE_ANON_KEY`, public-by-design).
- ✅ HTTPS enforced by GitHub Pages.
- ✅ Mollie key + service-role key in Supabase secrets vault.

### A03 — Injection
- ✅ SQL — supabase-js builder only, no string interpolation. `textSearch()` uses `websearch_to_tsquery` (parameterized).
- ✅ XSS — `grep -n innerHTML\|dangerouslySetInnerHTML` returns 0 hits in `web/src`. All user content goes through React text nodes.
- ✅ Path injection — N/A.
- ✅ Header injection — N/A (no user-controlled headers in edge fns).

### A04 — Insecure Design
- ⚠️ Donation rate limit (M-4).
- ⚠️ Edit-mode activation (L-3).
- ✅ Predictable IDs — Supabase UUIDs are random.
- ✅ CSRF — Supabase uses bearer tokens (no cookie auth = no CSRF).

### A05 — Security Misconfiguration
- ⚠️ Missing security headers (M-5).
- ⚠️ Donations RLS-no-policy (L-1, intentional but undocumented).
- ⚠️ SECURITY DEFINER triggers exposed (L-4).
- ✅ No debug endpoints, no stack traces in error responses (verified).
- ✅ No default credentials.

### A06 — Vulnerable Components
- ⚠️ 8 high + 2 moderate npm audit findings (H-1).
- ✅ Latest React 19, react-router 7, Supabase JS 2.98.

### A07 — Auth Failures
- ⚠️ Account enumeration via login errors (M-6).
- ⚠️ Default 6-char password minimum (M-7).
- ✅ Session managed by Supabase Auth (httponly + refresh).
- ✅ Logout invalidates session.
- ✅ Password reset uses signed link via email.

### A08 — Software & Data Integrity
- ⚠️ Mollie webhook unsigned but mitigated by re-fetch (M-3).
- ✅ CI uses `actions/checkout@v4` and pinned step versions in `.github/workflows/deploy-ghpages.yml`.
- ✅ Build artifacts not signed but deployed only by trusted CI to gh-pages.

### A09 — Logging & Monitoring
- ⚠️ Postgres error hint reflected to user (L-2).
- ❓ No audit log table for content writes (admin can edit any row without trace).
  Not formally a finding — acceptable for a single-admin content site, but worth
  noting if multi-admin is introduced.

### A10 — SSRF
- ✅ Edge functions only call `https://api.mollie.com/...` with hardcoded path.
- ✅ No user-controlled URLs in server-side fetches.
