# SchriftInzicht — Hosting Setup

## Overzicht
```
schriftinzicht.nl  → Cloudflare Pages (web app + landing)
Backend/API        → Supabase (bestaand)
E-mail             → Zoho Mail (gratis)
App                → Google Play (Expo/EAS)
```

---

## Stap 1: Cloudflare Account + Domein

1. **Account aanmaken**: https://dash.cloudflare.com/sign-up
2. **Domein registreren**: Dashboard → Domain Registration → Register Domain → `schriftinzicht.nl`
   - Prijs: ~€3,50/jaar (kostprijs, geen markup)
   - DNS wordt automatisch via Cloudflare beheerd

## Stap 2: Cloudflare Pages Project

1. Dashboard → **Pages** → **Create a project** → **Connect to Git**
2. Selecteer repo: `midirectiekade14-debug/schriftinzicht`
3. Build settings:
   - **Framework preset**: None
   - **Build command**: `cd web && npm ci && npm run build`
   - **Build output directory**: `web/dist`
4. **Deploy**

Of gebruik de GitHub Actions workflow (`.github/workflows/deploy-cloudflare.yml`):
1. Dashboard → **My Profile** → **API Tokens** → **Create Token**
   - Template: "Edit Cloudflare Workers" (of custom met Pages permissions)
2. Kopieer je **Account ID** (rechtsboven in dashboard)
3. In GitHub repo → Settings → Secrets → voeg toe:
   - `CLOUDFLARE_API_TOKEN` = je API token
   - `CLOUDFLARE_ACCOUNT_ID` = je account ID

## Stap 3: Custom Domain koppelen

1. Cloudflare Pages → je project → **Custom domains**
2. Voeg toe: `schriftinzicht.nl` en `www.schriftinzicht.nl`
3. DNS records worden automatisch aangemaakt (CNAME naar Pages)

## Stap 4: Zoho Mail (gratis e-mail)

1. Ga naar https://www.zoho.com/mail/zohomail-pricing.html → **Forever Free Plan**
2. Meld aan met `schriftinzicht.nl`
3. Voeg deze **DNS records** toe in Cloudflare DNS:

### MX Records
| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | @ | mx.zoho.eu | 10 |
| MX | @ | mx2.zoho.eu | 20 |
| MX | @ | mx3.zoho.eu | 50 |

### SPF (voorkomt spam-markering)
| Type | Name | Content |
|------|------|---------|
| TXT | @ | v=spf1 include:zoho.eu ~all |

### DKIM (Zoho geeft je de exacte waarde)
| Type | Name | Content |
|------|------|---------|
| TXT | zmail._domainkey | (Zoho genereert dit tijdens setup) |

4. Maak mailbox aan: `info@schriftinzicht.nl`

## Stap 5: GitHub Secrets instellen

```bash
# In je GitHub repo settings → Secrets and variables → Actions
CLOUDFLARE_API_TOKEN    = (van stap 2)
CLOUDFLARE_ACCOUNT_ID   = (van stap 2)
```

Na push naar `main` deployt de web-app automatisch.

---

## Kosten overzicht

| Item | Kosten/jaar |
|------|-------------|
| Domein (Cloudflare) | €3,50 |
| Hosting (Cloudflare Pages) | €0 |
| Backend (Supabase free) | €0 |
| E-mail (Zoho free) | €0 |
| Google Play | €25 eenmalig |
| **Totaal jaar 1** | **~€28,50** |
