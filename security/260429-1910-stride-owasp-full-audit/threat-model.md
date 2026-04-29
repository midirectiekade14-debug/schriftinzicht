# Threat Model — SchriftInzicht (web + supabase)

## Asset Inventory

| Asset | Location | Sensitivity | Protection |
|---|---|---|---|
| User accounts (email + hashed pw) | Supabase `auth.users` | High (PII) | Supabase Auth, GoTrue |
| User profiles | `public.user_profiles` | Medium | RLS: own-row |
| Bookmarks / search history | `public.bookmarks`, `public.search_history` | Medium | RLS: own-row |
| Donation records (donor name, amount, message, mollie_id) | `public.donations` | Medium (PII + financial) | No GRANT to anon/auth; RLS deny-all (service-role only via edge function) |
| Bible content (verses, kanttekeningen, commentaries, sermons, confessions) | content tables | Public | Public read; admin-only write (UUID gate) |
| Authors metadata + portraits | `public.authors`, Storage bucket `portraits` | Public | Public read |
| MI Platform tenant data | `public.ip_*` (companies, customers, jobs, quotes, communications, technicians, schedule_entries) | Confidential per tenant | RLS: per-company |
| Mollie API key | Supabase function secret `MOLLIE_API_KEY` | Critical | Encrypted secret |
| Supabase service role key | Function env `SUPABASE_SERVICE_ROLE_KEY` | Critical | Encrypted secret |
| Supabase anon key | `web/.env` + bundled in client JS | Public-by-design | RLS-gated |
| Mollie payment session | Mollie hosted checkout | High | Mollie 3DS / SCA |

## Trust Boundaries

```
Browser (untrusted) ─────────────────────────────┐
   │                                             │
   ├── HTTPS ──> GitHub Pages (static SPA)       │
   │     │   - schriftinzicht.nl                 │
   │     │   - Public read of bundle             │
   │     └── Anon / Auth supabase-js calls       │
   │                                             │
   │── HTTPS ──> Supabase REST + RPC             │
   │     │   - PostgREST + auth.uid()            │
   │     │   - RLS enforces row-level access     │
   │                                             │
   │── HTTPS ──> Supabase Edge Functions         │
   │     │   - donation-create (no JWT)          │
   │     │   - donation-status  (no JWT)         │
   │     │   - donation-webhook (Mollie callback)│
   │     │   ↓ uses service-role key             │
   │     ↓                                       │
   │   Mollie API ──> Bank ──> Webhook back      │
   │                                             │
└─────────────────────────────────────────────────┘

Server-side trust boundaries:
  * Browser ←→ PostgREST    (RLS enforced)
  * Browser ←→ Edge Function (no JWT — relies on app-level constraints)
  * Edge Function ←→ Postgres (service-role bypasses RLS)
  * Edge Function ←→ Mollie API (token in env)
  * GitHub Actions ←→ Supabase (CI uses GH secrets)
  * Public anon role ←→ user role (escalation via auth.uid())
  * User role ←→ admin (single hardcoded UUID)
```

## STRIDE Threat Matrix

| Asset / Boundary | S | T | R | I | D | E |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| User session | ✓ M-1 | – | ✗ | – | – | – |
| Donation flow | ✓ M-1 | ✓ M-3 | ✓ M-7 | – | ✓ M-4 | – |
| Admin write (RLS) | ✓ M-1 | – | ✗ | – | – | ✓ M-2 |
| `public.donations` | – | – | – | ✓ L-1 | ✓ M-4 | – |
| Edge function endpoints | – | – | – | – | ✓ M-4 | – |
| Edit-mode iframe (`?edit=1`) | – | ✓ L-3 | – | – | – | – |
| Mollie webhook | ✓ M-1 | – | – | – | – | – |
| Search / RPC layer | – | ✓ L-2 | – | ✓ L-2 | – | – |
| Static asset hosting (GH Pages) | – | – | – | ✓ M-5 | – | – |
| Dependency tree | – | ✓ H-1 | – | – | – | ✓ H-1 |
| `SECURITY DEFINER` triggers | ✓ L-4 | – | – | – | – | ✓ L-4 |

Legend: M-x / H-x / L-x → finding ID in [findings.md](./findings.md).
