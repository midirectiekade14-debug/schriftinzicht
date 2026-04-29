# Attack Surface Map

## Entry Points

| Entry | Path / Endpoint | Auth | Notes |
|---|---|:-:|---|
| Static SPA | `https://schriftinzicht.nl/*` | none | Public bundle, anon Supabase key embedded |
| Login / register | `/inloggen` | none | `supabase.auth.signInWithPassword` |
| Password reset | `/inloggen` (resetMode) | none | `resetPasswordForEmail` |
| Admin panel | `/beheer` | required | Client allowlist + RLS UUID gate |
| Edit mode iframe | `/*?edit=1` | none | postMessage to parent (admin tooling) |
| Search query | `/zoeken?q=<term>` | none | Postgres `websearch_to_tsquery('dutch', q)` |
| Author/verse navigation | `/boeklezer/:authorId`, `/preek/:id`, `/bijbel/:bookId/:chapter` | none | Path params used as `.eq()` filters |
| User profile / bookmarks | supabase REST | required | RLS: own-row |
| Donation start | edge fn `donation-create` | none (`--no-verify-jwt`) | POST { amount, name, message } |
| Donation status | edge fn `donation-status` | none | POST { paymentId } |
| Mollie webhook | edge fn `donation-webhook` | none | Mollie callback (no signature) |
| Storage bucket | `…/storage/v1/object/public/portraits/*` | public | Read-only public bucket |

## Data Flows

```
User input  ─→  client-side validation  ─→  Supabase REST  ─→  RLS  ─→  Postgres
                                            │
                                            └→  Edge Function (service-role) ─→  Postgres
                                                  │
                                                  └→  Mollie API
```

## Abuse Paths

1. **Bot fills `donations` with junk pending records**
   `donation-create --no-verify-jwt` + no app-level rate limit + no captcha →
   bot can repeatedly POST → Mollie creates pending payments → DB row inserted →
   table grows without admin awareness. Mollie's per-merchant rate limit is the
   only upstream gate.

2. **Header-based clickjacking**
   Missing `X-Frame-Options` / CSP `frame-ancestors` → site can be iframed by
   third parties → if admin is logged in and visits attacker-controlled page,
   UI redress could trick clicks. Mitigated in practice because EditOverlay
   targets `window.location.origin` for postMessage (browser drops cross-origin
   delivery), but the missing header is still a hardening gap.

3. **Email enumeration via login error messages**
   Login flow returns slightly different errors for "not confirmed" vs
   "invalid login". Allows attacker to learn whether an email is registered.

4. **Bulk Mollie API quota burn**
   Same as #1 but viewed as cost: unauthenticated POSTs to `donation-create`
   each consume one Mollie payment-create call, costing both money/quota and
   filling the merchant's pending-payment list.

5. **Search-error reflection**
   `setError(\`Fout bij het zoeken: ${msg.slice(0,120)}\`)` echoes back the
   Supabase error message. With React text rendering this is auto-escaped,
   but verbose DB hints could reveal schema details to a curious user.

6. **Single-UUID admin lock-in**
   All write policies are `auth.uid() = '7e2ac885-...'`. Loss of this account
   = no one can administrate. Plus all write privilege concentrates in one
   credential — phishing or token theft = full content tampering.

## Out-of-Scope (Confirmed Safe)

- **innerHTML / dangerouslySetInnerHTML**: 0 occurrences in `web/src` — content
  is rendered via React text nodes or React Router `<Link>`, both auto-escape.
- **Direct SQL**: no string concatenation, all queries use supabase-js builder
  with parameterized `.eq()` / `.in()` / `.textSearch()`.
- **Service worker caching**: kill-switch only, never caches → no stale-attack.
- **Open redirect via `?return=`**: react-router `navigate()` treats absolute
  URLs as paths; `https://evil.com` becomes `/https://evil.com` (in-app, 404).
- **localStorage abuse**: stored values are bookmarks / saved-verses / search
  history, no tokens or credentials.
