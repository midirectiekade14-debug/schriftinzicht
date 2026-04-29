# Security Audit — STRIDE + OWASP Full Audit

**Date:** 2026-04-29 19:10
**Scope:** `web/` (React 19 + Vite SPA on GitHub Pages) + `supabase/` (Postgres + 3 edge functions)
**Focus:** comprehensive (post-deploy of full-text search + auth-aware query parsing)
**Iterations:** 15 + setup baseline (bounded)
**Mode:** read-only report (no auto-fix)

## Summary

- **Total Findings:** 15
  - **Critical:** 0
  - **High:** 1 (npm dev-dep CVEs)
  - **Medium:** 7
  - **Low:** 4
  - **Info:** 3
- **STRIDE Coverage:** 6/6 categories tested
- **OWASP Coverage:** 10/10 categories tested
- **Confirmed:** 12 · **Likely:** 1 · **N/A clean:** 2

## Top 3 Concerns

1. **[H-1] Outdated build dependencies** — 8 high-severity npm audit findings in
   `vite`, `workbox-build`, `serialize-javascript` chain. Build-time only, but a
   compromised dep can poison the production bundle. Fix: `npm audit fix` plus
   removing the disabled `vite-plugin-pwa`.
   → [findings.md#high-h-1](./findings.md#high-h-1--outdated-build-dependencies-with-known-cves)

2. **[M-1] Single hardcoded admin UUID across all RLS write policies.** Both
   the client allowlist (`Admin.tsx`) and the database write policies are tied
   to one UUID. Phishing or token theft of that account = full content
   tampering. Recommended: replace with an `admins` table + `is_admin()`
   function.
   → [findings.md#medium-m-1](./findings.md#medium-m-1--single-hardcoded-admin-uuid-across-all-write-policies)

3. **[M-4] `donation-create` edge function has no rate limit and no auth.**
   `--no-verify-jwt` plus no captcha = bots can spawn pending Mollie payments
   and fill the `donations` table. Fix: add Cloudflare Turnstile or per-IP rate
   limit, plus a periodic cleanup migration.
   → [findings.md#medium-m-4](./findings.md#medium-m-4--donation-create-has-no-rate-limiting-and-no-auth)

## Strengths Observed

- ✅ **No XSS surface** — `grep` returns zero `innerHTML` / `dangerouslySetInnerHTML`
  occurrences in `web/src`. All user-renderable content goes through React text
  nodes (auto-escaped) or JSX attributes (also escaped).
- ✅ **No SQL injection vectors** — all queries use the supabase-js builder
  pattern with `.eq()`/`.in()`/`.textSearch()`; the latter wraps user input in
  `websearch_to_tsquery('dutch', $1)` which is parameterized.
- ✅ **Donations table is doubly protected** — RLS enabled with no policies
  (deny-all) AND `anon` role lacks the basic `GRANT SELECT`. Edge functions
  use the service-role key.
- ✅ **No SSRF surface** — edge functions only call `https://api.mollie.com/v2/payments/{validated_id}`.
  No user-controlled URLs in server-side fetches.
- ✅ **CSRF non-issue** — Supabase auth uses bearer tokens, not cookies.
- ✅ **Pinned edge-function imports** — version-pinned URLs for Deno + supabase-js.
- ✅ **Secrets handled correctly** — Mollie key + service-role key in Supabase
  vault; only `VITE_SUPABASE_ANON_KEY` is in the bundle (public by design,
  protected by RLS).

## Files in This Report

- [Threat Model](./threat-model.md) — assets, trust boundaries, STRIDE matrix
- [Attack Surface Map](./attack-surface-map.md) — entry points, data flows, abuse paths
- [Findings](./findings.md) — full proof for every finding, descending severity
- [OWASP Coverage](./owasp-coverage.md) — per-category test results
- [Dependency Audit](./dependency-audit.md) — npm audit details + remediation
- [Recommendations](./recommendations.md) — prioritized mitigations with code
- [Iteration Log](./security-audit-results.tsv) — TSV of every vector tested

## Coverage

| OWASP | Tested | Findings |
|---|:-:|:-:|
| A01 Broken Access Control | ✓ | 2 |
| A02 Cryptographic Failures | ✓ | 0 |
| A03 Injection | ✓ | 0 |
| A04 Insecure Design | ✓ | 2 |
| A05 Security Misconfiguration | ✓ | 3 |
| A06 Vulnerable Components | ✓ | 1 |
| A07 Auth Failures | ✓ | 2 |
| A08 Software & Data Integrity | ✓ | 1 |
| A09 Logging & Monitoring | ✓ | 1 |
| A10 SSRF | ✓ | 0 |

| STRIDE | Tested | Findings |
|---|:-:|:-:|
| Spoofing | ✓ | 4 |
| Tampering | ✓ | 4 |
| Repudiation | ✓ | 0 |
| Information Disclosure | ✓ | 4 |
| Denial of Service | ✓ | 1 |
| Elevation of Privilege | ✓ | 4 |

## Quick-Start Remediation

Run these in order — together they close all High + Medium findings in roughly
2–3 hours of focused work:

```bash
# 1. Patch deps (15 min)
cd ~/projects/schriftinzicht/web
npm uninstall vite-plugin-pwa workbox-window
npm audit fix
npm run build

# 2. Add security-headers meta tags (15 min)
# Edit web/index.html per recommendations.md §4

# 3. Generic auth errors (5 min)
# Edit web/src/pages/Inloggen.tsx per recommendations.md §5

# 4. Stronger password policy (5 min)
# Supabase Dashboard → Auth → Policies → min 10 chars + breach check

# 5. Sanitize search error reflection (5 min)
# Edit web/src/pages/Zoeken.tsx describeError catch blocks

# 6. Apply migrations for admin role + donations comment + revoke triggers (1 h)
# See recommendations.md §2, §7, §10

# 7. Add Turnstile to donation flow (1 h)
# See recommendations.md §3

# 8. Re-audit
claude -p "/autoresearch:security --diff"
```

## Files & Branches

This audit ran against:
- branch: `master`
- commit: `8abd1f46…` (PR #7 merged earlier this session, full-text search + author filter + pagination)
- supabase project: `mkwqiqssuhunbhvwrsdt`

No code was modified by this audit. All output lives in
`security/260429-1910-stride-owasp-full-audit/`.
