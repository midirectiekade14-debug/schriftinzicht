-- Donations table — Mollie payments tracking
-- Edge functions write via service role; clients have no direct access.

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  mollie_id text unique not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'EUR',
  status text not null,
  donor_name text,
  donor_message text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists donations_status_idx on public.donations (status);
create index if not exists donations_created_at_idx on public.donations (created_at desc);

alter table public.donations enable row level security;

-- Deny-all by default. Service role bypasses RLS. Admin reads can be added later.
revoke all on public.donations from anon, authenticated;
