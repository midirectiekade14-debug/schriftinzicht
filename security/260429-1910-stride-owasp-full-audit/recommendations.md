# Prioritized Mitigations

## Priority 1 — High (this week)

### 1. Patch build dependencies
**Finding:** [H-1](./findings.md#high-h-1--outdated-build-dependencies-with-known-cves)
**Effort:** 15 min · auto-fixable

```bash
cd web
npm uninstall vite-plugin-pwa workbox-window  # disabled anyway
npm audit fix
git diff package-lock.json | less              # sanity check
npm run build                                   # verify build still works
```

If audits remain, run `npm audit fix --force` and review each major bump.

---

## Priority 2 — Medium (this sprint)

### 2. Replace single-UUID admin gate with role table
**Finding:** [M-1](./findings.md#medium-m-1--single-hardcoded-admin-uuid-across-all-write-policies)
**Effort:** 1–2 h

```sql
-- migration: 20260430_admin_role.sql
CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id)
);

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Bootstrap current admin
INSERT INTO public.admins (user_id) VALUES ('7e2ac885-0cdf-42a4-9f10-ca84bf1d889e');

-- Replace policy on each table:
DROP POLICY "Admin kan bijwerken" ON public.commentaries;
CREATE POLICY admin_write ON public.commentaries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- ...repeat for authors, bible_verses, sermons, kanttekeningen, source_works,
-- catechism_questions, catechism_proof_texts, confessions,
-- confession_articles, confession_proof_texts, cross_references
```

Then in `web/src/pages/Admin.tsx` replace:

```typescript
const ADMIN_EMAILS = ['harm@maatwerkinterieurs.info'];
const isAdmin = isLoggedIn && ADMIN_EMAILS.includes(user?.email || '');
```

with an RPC call:

```typescript
const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
useEffect(() => {
  if (!user) { setIsAdmin(false); return; }
  supabase.rpc('is_admin').then(({ data }) => setIsAdmin(data === true));
}, [user]);
```

---

### 3. Add rate-limit + captcha to `donation-create`
**Finding:** [M-4](./findings.md#medium-m-4--donation-create-has-no-rate-limiting-and-no-auth)
**Effort:** 1 h

Free path — Cloudflare Turnstile (anonymous, no UI for legitimate users):

```html
<!-- Doneren.tsx form -->
<div className="cf-turnstile" data-sitekey="{TURNSTILE_SITE_KEY}"></div>
```

```typescript
// Pass token to function
await supabase.functions.invoke('donation-create', {
  body: { amount, name, message, captchaToken: token },
});
```

```typescript
// donation-create/index.ts — verify token
const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ secret: Deno.env.get('TURNSTILE_SECRET')!, response: body.captchaToken }),
});
const verify = await verifyRes.json();
if (!verify.success) return json({ error: 'captcha_failed' }, 403);
```

Also add a periodic cleanup migration:

```sql
DELETE FROM public.donations
WHERE status = 'open' AND created_at < now() - interval '24 hours';
```

---

### 4. Add security headers via `<meta>`
**Finding:** [M-5](./findings.md#medium-m-5--missing-security-headers-on-schriftinzichtnl)
**Effort:** 15 min

In `web/index.html` `<head>` (right after `<meta name="theme-color">`):

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.mollie.com; frame-ancestors 'self'; base-uri 'self'">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```

Verify after deploy: `curl -I https://schriftinzicht.nl | grep -i 'content-security'`
(meta tags don't show in HTTP headers but DevTools → Issues will confirm
they're applied to the document).

For full HTTP-header coverage, consider fronting GH Pages with Cloudflare (free
tier) and using a Transform Rule to inject `Strict-Transport-Security`,
`X-Frame-Options: DENY`, and `Permissions-Policy`.

---

### 5. Generic login/signup error messages
**Finding:** [M-6](./findings.md#medium-m-6--login-error-messages-enable-account-enumeration)
**Effort:** 5 min · `web/src/pages/Inloggen.tsx`

```typescript
// Replace the if/else chain with:
if (mode === 'login') {
  const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (err) {
    if (/rate/i.test(err.message)) setError('Te veel pogingen. Probeer het later opnieuw.');
    else setError('Onjuist e-mailadres of wachtwoord, of het account is nog niet bevestigd.');
  } else {
    navigate(returnTo, { replace: true });
  }
}

// And signup:
} else {
  const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
  // Don't differentiate "already exists" — Supabase still sends the confirmation email
  // for new addresses and silently no-ops for existing ones.
  setSuccess('Als dit e-mailadres nog niet geregistreerd is, ontvang je een bevestiging.');
}
```

---

### 6. Strengthen password policy
**Finding:** [M-7](./findings.md#medium-m-7--no-password-policy-enforcement-on-registration)
**Effort:** 5 min · Supabase Dashboard

Supabase Dashboard → Authentication → Policies:

- Minimum length: **10**
- Require: **lowercase + uppercase + numeric** (or accept HIBP-leak check)
- Enable **HaveIBeenPwned** breach check

Then update the Inloggen.tsx signup error map for `password.*length` and
`pwned password` Supabase error variants.

---

### 7. Document/lock down `donations` RLS
**Finding:** [L-1](./findings.md#low-l-1--donations-table-has-rls-enabled-but-zero-policies)
**Effort:** 5 min

```sql
-- migration: 20260430_donations_explicit_deny.sql
COMMENT ON TABLE public.donations IS
  'Service-role only. Inserts via donation-create edge function, updates via donation-webhook. RLS deny-all is intentional; never add anon/auth policies.';

CREATE POLICY donations_explicit_deny ON public.donations
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
```

---

## Priority 3 — Low (next sprint / hardening)

### 8. Sanitize search error messages
**Finding:** [L-2](./findings.md#low-l-2--search-error-message-echoes-postgres-hint-to-user)
**Effort:** 5 min · `web/src/pages/Zoeken.tsx` describeError catches

```typescript
} catch (err) {
  const msg = describeError(err);
  console.error('[Zoeken] tekst-zoekopdracht faalde:', msg, err);
  const isNetwork = /failed to fetch|network|offline/i.test(msg);
  const isTimeout = /timeout|57014/i.test(msg);
  setError(isNetwork
    ? 'Geen verbinding met de zoekserver. Controleer je internetverbinding.'
    : isTimeout
    ? 'De zoekopdracht duurde te lang. Probeer een specifiekere zoekterm.'
    : 'Fout bij het zoeken. Probeer een andere zoekterm.');
}
```

### 9. Gate edit-mode on parent handshake
**Finding:** [L-3](./findings.md#low-l-3--edit-mode-iframe-is-enabled-by-url-param-alone)
**Effort:** 30 min · `web/src/components/EditOverlay.tsx`

Only activate after the admin parent has posted an explicit `si-edit-on`
message:

```typescript
const [parentApproved, setParentApproved] = useState(false);

useEffect(() => {
  if (!editMode) return;
  const handler = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (e.data?.type === 'si-edit-on') setParentApproved(true);
  };
  window.addEventListener('message', handler);
  // Tell parent we're ready
  window.parent.postMessage({ type: 'si-edit-ready' }, window.location.origin);
  return () => window.removeEventListener('message', handler);
}, [editMode]);

if (!editMode || !parentApproved) return null;
```

### 10. Revoke EXECUTE on trigger functions
**Finding:** [L-4](./findings.md#low-l-4--trigger-functions-exposed-via-postgrest-rpc)
**Effort:** 5 min

```sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user()    FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_ip_user() FROM anon, authenticated, public;
```

Triggers continue to fire (they run as the table owner, not via RPC).

---

## Verification After Fixes

Run after applying changes:

```bash
# Re-run audit to confirm closure
cd ~/projects/schriftinzicht
claude -p "/autoresearch:security --diff"
```

Expected delta:
- H-1 → Fixed (npm audit clean)
- M-1 to M-7 → Fixed
- L-1 to L-4 → Fixed
- Total findings: 0 high, ≤2 medium, low/info acceptable
