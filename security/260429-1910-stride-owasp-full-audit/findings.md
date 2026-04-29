# Findings — Severity-Ranked

**0 Critical · 1 High · 7 Medium · 4 Low · 3 Info**

---

## [HIGH] H-1 — Outdated build dependencies with known CVEs

- **OWASP:** A06 Vulnerable & Outdated Components
- **STRIDE:** Tampering / Elevation of Privilege (build-time)
- **Location:** `web/package-lock.json`
- **Confidence:** Confirmed (`npm audit` output)

**Description.** `npm audit` reports 8 high-severity and 2 moderate-severity
advisories in the build pipeline:

| Severity | Package | Path |
|---|---|---|
| high | `vite` 7.3.1 → patched | direct dep |
| high | `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-terser` → `serialize-javascript` | nested |
| high | `lodash`, `picomatch`, `flatted` | transitive |
| moderate | `brace-expansion`, `postcss` | transitive |

These are dev-time only (no runtime exposure), but a compromised build can
inject arbitrary JS into the production bundle.

**Code Evidence.** `npm audit --json` returns `vulnerabilities.high = 8`.

**Mitigation.**
```bash
cd web
npm audit fix
# If `--force` is needed, vet the resulting major-version bumps before
# committing. Vite 7 → 8 may need config changes.
```

`vite-plugin-pwa` is listed in `package.json` but the PWA is disabled (see
`vite.config.ts`); consider removing it entirely to shrink the dep tree.

---

## [MEDIUM] M-1 — Single hardcoded admin UUID across all write policies

- **OWASP:** A01 Broken Access Control / A04 Insecure Design
- **STRIDE:** Spoofing, Elevation of Privilege
- **Location:**
  - `web/src/pages/Admin.tsx:12` (client allowlist)
  - All RLS write policies (e.g. `authors`, `bible_verses`, `commentaries`, …)
- **Confidence:** Confirmed

**Description.** Every INSERT/UPDATE/DELETE policy on every content table is
of the form

```sql
auth.uid() = '7e2ac885-0cdf-42a4-9f10-ca84bf1d889e'::uuid
```

Single point of failure: phishing or credential theft of that one account =
full content tampering across the entire database. There is no admin role,
group, or `is_admin` claim — adding a second admin requires writing 50+
parallel policies.

**Attack Scenario.** Attacker phishes harm@…, gains access. Browser-side
Admin.tsx allowlist is checked but RLS is the real gate — both rely on the
same UUID, so a single token compromise = full write access.

**Code Evidence.**
```typescript
// web/src/pages/Admin.tsx:12
const ADMIN_EMAILS = ['harm@maatwerkinterieurs.info'];
```

```sql
-- public.commentaries policy
qual: (auth.uid() = '7e2ac885-0cdf-42a4-9f10-ca84bf1d889e'::uuid)
```

**Mitigation.**
1. Create an `admins` table or boolean `user_profiles.is_admin` column,
   write via SQL migration.
2. Replace policies with: `EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())`.
3. Enable MFA on the admin account (Supabase supports TOTP since 2024).
4. Optional: scope-down the admin UUID further (separate "content editor"
   from "schema admin" roles).

---

## [MEDIUM] M-2 — Client-side admin allowlist is informational only

- **OWASP:** A01 Broken Access Control
- **STRIDE:** Elevation of Privilege
- **Location:** `web/src/pages/Admin.tsx:12,29`
- **Confidence:** Confirmed (defense-in-depth gap, not exploitable alone)

**Description.** The `/beheer` route checks `ADMIN_EMAILS` client-side:

```typescript
const isAdmin = isLoggedIn && ADMIN_EMAILS.includes(user?.email || '');
if (!isAdmin) return <Navigate to="/zoeken" replace />;
```

A motivated attacker with any account can bypass this with five lines of dev-tools
JS to mount the admin components and click around. The actual writes are still
gated by RLS (good), but the admin **UI** including the LiveEditor leaks
internal table/column names and edit affordances to every user. Combine with
M-1 and a token-theft scenario becomes more impactful (attacker has a friendly
UI to abuse).

**Mitigation.**
- Verify admin status server-side via an RPC: `SELECT is_admin()`.
- Consider gating the entire `/beheer` route via a Supabase edge function that
  returns the admin SPA chunk only after server check.

---

## [MEDIUM] M-3 — `donation-webhook` does not authenticate Mollie callbacks

- **OWASP:** A08 Software and Data Integrity Failures
- **STRIDE:** Tampering, Spoofing
- **Location:** `supabase/functions/donation-webhook/index.ts`
- **Confidence:** Likely (Mollie does not offer signed webhooks; current code
  is the recommended pattern)

**Description.** Mollie does not sign webhooks. The function defends itself
by:

1. Validating `tr_[A-Za-z0-9]+` format on the incoming `id`,
2. Confirming the ID exists in our own `donations` table,
3. Re-fetching the actual status from `api.mollie.com` using the merchant's
   API key.

This is correct: an attacker who guesses or replays a `tr_xxx` ID can at
worst trigger a no-op refresh of an existing donation status. They cannot
forge a "paid" state because the function trusts only the Mollie API
response, not the request body.

**Risk that remains.** A bot that sends thousands of valid `tr_*` IDs (e.g.
ones it has scraped) would cause us to make thousands of Mollie API calls →
quota / cost burn. Combined with M-4 (no rate limit), this is a real DoS
vector.

**Mitigation.**
- Add IP-based rate limiting on the webhook (Cloudflare WAF or function-level).
- Optionally check `Mollie-Source-IP` / `X-Forwarded-For` against Mollie's
  published IP range.

---

## [MEDIUM] M-4 — `donation-create` has no rate limiting and no auth

- **OWASP:** A04 Insecure Design / A05 Security Misconfiguration
- **STRIDE:** Denial of Service, Repudiation
- **Location:** `supabase/functions/donation-create/index.ts` (deployed
  with `--no-verify-jwt`)
- **Confidence:** Confirmed

**Description.** A bot can POST to `…/functions/v1/donation-create` without
authentication. Each call:

1. Hits Mollie API (consumes our merchant quota and creates a real pending
   payment),
2. Inserts a row into `public.donations` (via service-role key, bypassing
   RLS),
3. Logs to function logs.

A flood of 10K calls/min would create 10K pending Mollie payments and 10K
junk DB rows.

**Code Evidence.**
```typescript
// donation-create/index.ts (no rate limiter, no captcha)
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  // ...goes straight to Mollie...
});
```

**Mitigation.**
1. Add a Turnstile / hCaptcha token check (Cloudflare Turnstile is free).
2. Or rate-limit by IP via Upstash Redis or Supabase's `vault` rate counter.
3. Add a `cleanup_pending_donations` migration that deletes rows with
   `status='open'` older than 24h.

---

## [MEDIUM] M-5 — Missing security headers on schriftinzicht.nl

- **OWASP:** A05 Security Misconfiguration
- **STRIDE:** Information Disclosure, Tampering (clickjacking)
- **Location:** GitHub Pages response (`curl -I https://schriftinzicht.nl/`)
- **Confidence:** Confirmed

**Description.** Live response lacks every common hardening header:

```
Server: GitHub.com
Cache-Control: max-age=600
Access-Control-Allow-Origin: *
(no CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
```

GitHub Pages serves over HTTPS and the redirector enforces it, but the
absence of `Strict-Transport-Security` means a first-time visitor over a
hostile network could be downgraded. No `X-Frame-Options` / `frame-ancestors`
means the site can be iframed (clickjacking risk for the admin / login pages).
`Access-Control-Allow-Origin: *` is fine for a static site but combined with
no CSP gives a compromised CDN free reign.

**Mitigation.** GitHub Pages cannot set custom HTTP headers, but most can be
set via `<meta http-equiv>` in `web/index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';   <!-- inline GH-Pages SPA redirect -->
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co https://api.mollie.com;
  frame-ancestors 'self';
  base-uri 'self';
">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```

(`Strict-Transport-Security` and `X-Frame-Options` are HTTP-only and cannot
be set via meta — accept that gap on GH Pages, or move to a CDN that can
inject them, e.g. Cloudflare in front.)

---

## [MEDIUM] M-6 — Login error messages enable account enumeration

- **OWASP:** A07 Identification and Authentication Failures
- **STRIDE:** Information Disclosure
- **Location:** `web/src/pages/Inloggen.tsx:42-58`
- **Confidence:** Confirmed

**Description.** The login handler maps Supabase errors to localized messages:

```typescript
if (msg.includes('invalid login'))     setError('Onjuist e-mailadres of wachtwoord.');
else if (msg.includes('not confirmed')) setError('E-mailadres is nog niet bevestigd.');
```

The "not confirmed" branch confirms the email exists. An attacker can iterate
a list of emails and learn which ones are registered.

The signup branch does the same:

```typescript
if (msg.includes('already registered')) setError('Dit e-mailadres is al in gebruik.');
```

**Mitigation.** Use a single generic message for both `invalid_login` and
`not_confirmed` ("Onjuist e-mailadres of wachtwoord, of het account is nog
niet bevestigd"). Same for signup ("Als dit adres nog niet geregistreerd is
ontvang je een e-mail").

---

## [MEDIUM] M-7 — No password-policy enforcement on registration

- **OWASP:** A07 Identification and Authentication Failures
- **STRIDE:** Spoofing
- **Location:** `web/src/pages/Inloggen.tsx`, Supabase Auth defaults
- **Confidence:** Confirmed (default Supabase minimum is 6 chars, no zxcvbn)

**Description.** Supabase's default minimum password length is 6 characters
with no complexity rules. The code does not impose any additional rules.

**Mitigation.** Configure password requirements in Supabase Dashboard
(Auth → Policies). Recommend ≥10 chars, optionally enable "leaked passwords"
check (Supabase has this built in).

---

## [LOW] L-1 — `donations` table has RLS enabled but zero policies

- **OWASP:** A05 Security Misconfiguration
- **STRIDE:** Information Disclosure
- **Location:** `public.donations`
- **Confidence:** Confirmed (Supabase advisor lint `0008_rls_enabled_no_policy`)

**Description.** `donations.relrowsecurity = true` but `pg_policies` returns
zero rows for the table. This is the strictest possible state for normal
roles (deny-all), AND `anon` doesn't have GRANT SELECT either, so the table
is effectively only reachable through edge-function service-role queries.

**Why this is still a finding.**
1. The intent isn't documented — a future engineer might "fix" it by adding
   a permissive policy.
2. If the service-role key ever leaks (e.g. in a function log), the absence
   of any defense-in-depth policy means full compromise of donation data.

**Mitigation.** Add explicit deny-all policies + a comment:
```sql
COMMENT ON TABLE public.donations IS
  'Service-role only. RLS deny-all is intentional; never add anon/auth policies.';

CREATE POLICY donations_no_anon ON public.donations
  FOR ALL TO anon, authenticated USING (false);
```

---

## [LOW] L-2 — Search error message echoes Postgres hint to user

- **OWASP:** A09 Security Logging & Monitoring Failures (info disclosure)
- **STRIDE:** Information Disclosure
- **Location:** `web/src/pages/Zoeken.tsx` `describeError()` + catch blocks
- **Confidence:** Confirmed

**Description.** When a Supabase query fails, the user-facing error becomes
`"Fout bij het zoeken: ${msg.slice(0,120)}"` where `msg` may contain
Postgres `.message` / `.details` / `.hint` strings. While 120 chars is
short, fields like "permission denied for table X" or "canceling statement
due to statement timeout" still leak schema/runtime details.

**Mitigation.** Show generic copy to users; log the detail:
```typescript
console.error('[Zoeken] query failed:', err);
setError('Fout bij het zoeken. Probeer een andere zoekterm.');
```

---

## [LOW] L-3 — Edit-mode iframe is enabled by URL param alone

- **OWASP:** A04 Insecure Design
- **STRIDE:** Tampering (UX-level only — no privilege escalation)
- **Location:** `web/src/components/EditOverlay.tsx`
- **Confidence:** Confirmed (no security impact, UX-only annoyance)

**Description.** Visiting any URL with `?edit=1` flips the SPA into edit
mode: clicks on `[data-edit-table]` elements are intercepted, hover styles
appear, and a postMessage is fired at `window.parent`. For a normal visitor
who lands on a shared link with `?edit=1`, all clicks become no-ops — they
can't navigate.

The postMessage uses `targetOrigin = window.location.origin`, so cross-origin
delivery is blocked by the browser. There's no exploitable issue, but a
user-facing footgun: a shared link with the param creates a confusingly
broken app.

**Mitigation.** Guard the activation behind a session flag set by the admin
parent window via postMessage handshake, or check `window.parent !==
window` before activating.

---

## [LOW] L-4 — Trigger functions exposed via PostgREST RPC

- **OWASP:** A05 Security Misconfiguration
- **STRIDE:** Spoofing / Elevation of Privilege (theoretical)
- **Location:** `public.handle_new_user()`, `public.handle_new_ip_user()`
- **Confidence:** Confirmed (Supabase advisor lint `0028` and `0029`)

**Description.** Both functions are AFTER-INSERT triggers on `auth.users`
but, because they live in the `public` schema, PostgREST exposes them at
`/rest/v1/rpc/handle_new_user` and `/rest/v1/rpc/handle_new_ip_user`.

Attempting to call them from anon/auth without the trigger context fails
because `NEW` is unbound — so there is no realistic exploit. But they
are **`SECURITY DEFINER`** functions exposed to public, which is a clear
hardening anti-pattern flagged by the linter.

**Mitigation.**
```sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user()     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_ip_user() FROM anon, authenticated;
-- or move them to a non-public schema:
ALTER FUNCTION public.handle_new_user() SET SCHEMA private_triggers;
```

---

## [INFO] I-1 — Admin email leaks owner's contact address

- **Location:** `web/src/pages/Admin.tsx:12` (`harm@maatwerkinterieurs.info`)
- **Confidence:** Confirmed

The owner's personal email is hardcoded into the public bundle. Not a
vulnerability per se, but invites targeted phishing. Consider moving to an
`is_admin` flag (see M-1) and removing the constant.

---

## [INFO] I-2 — `Access-Control-Allow-Origin: *` on edge functions

- **Location:** `donation-create`, `donation-status`, `donation-webhook`
- **Confidence:** Acceptable

CORS wildcard is appropriate for these public POST endpoints. No credentials
are sent from the browser (no `withCredentials`), so wildcard is safe and
intentional.

---

## [INFO] I-3 — npm dev-only audit issues are not runtime-exposed

- **Location:** `web/package-lock.json`

The high-severity audits in H-1 are dev-deps only (vite, workbox-build,
serialize-javascript). They affect the build pipeline integrity but never
ship to the browser. Severity is graded High because a compromised build
can poison the production bundle, but actual runtime risk is limited.
