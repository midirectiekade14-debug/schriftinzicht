# SchriftInzicht — Hosting Setup

## Overzicht

```
schriftinzicht.nl  → GitHub Pages (gh-pages branch van midirectiekade14-debug/schriftinzicht)
Backend/API        → Supabase
E-mail             → (optioneel) Zoho Mail gratis plan
App                → Google Play (Expo/EAS, WebView wrapper)
```

Domein is geregistreerd bij **yourhosting**; DNS wordt daar beheerd.

---

## Auto-deploy

Workflow: `.github/workflows/deploy-ghpages.yml`

- **Trigger**: push naar `master` met wijzigingen in `web/**` (of handmatig via workflow_dispatch)
- **Build**: `npm ci && npm run build` in `web/` (Node 20, npm cache via `setup-node`)
- **Deploy**: `peaceiris/actions-gh-pages@v4` pusht `web/dist/` naar `gh-pages` + zet `CNAME` met `schriftinzicht.nl`

### Benodigde GitHub Secrets
In `Settings → Secrets and variables → Actions`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Zonder deze: de build slaagt maar de runtime krijgt lege Supabase config → zwart scherm.

---

## DNS (yourhosting)

### A-records op `@` (apex)
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### CNAME op `www`
```
www  CNAME  midirectiekade14-debug.github.io.
```

### Optioneel — AAAA op `@` (IPv6)
```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

TTL: 3600 (of default). Bestaande conflicterende records op `@` en `www` eerst verwijderen.

Verifieer met: `dig schriftinzicht.nl +short` of `nslookup schriftinzicht.nl`.

---

## GitHub Pages config

Gezet via API:
```bash
gh api -X PUT repos/midirectiekade14-debug/schriftinzicht/pages \
  -f cname=schriftinzicht.nl
```

Na succesvolle DNS propagatie + cert provisioning (~15 min tot enkele uren):
```bash
gh api -X PUT repos/midirectiekade14-debug/schriftinzicht/pages \
  -F https_enforced=true
```

Check status: `gh api repos/midirectiekade14-debug/schriftinzicht/pages`.

---

## Handmatige fallback (als Actions plat ligt)

```bash
cd ~/projects/schriftinzicht
npm ci --prefix web && npm run build --prefix web
git worktree add ../_ghpages gh-pages
find ../_ghpages -maxdepth 1 -not -name '.' -not -name '.git' -exec rm -rf {} +
cp -r web/dist/. ../_ghpages/
echo "schriftinzicht.nl" > ../_ghpages/CNAME
touch ../_ghpages/.nojekyll
cd ../_ghpages && git add -A && git commit -m "deploy: manual" && git push
cd - && git worktree remove ../_ghpages && git worktree prune
```

---

## Zoho Mail (optioneel)

Voor `info@schriftinzicht.nl`. Zet in yourhosting DNS:

### MX
| Name | Type | Content | Priority |
|------|------|---------|----------|
| @ | MX | mx.zoho.eu | 10 |
| @ | MX | mx2.zoho.eu | 20 |
| @ | MX | mx3.zoho.eu | 50 |

### SPF
| Name | Type | Content |
|------|------|---------|
| @ | TXT | `v=spf1 include:zoho.eu ~all` |

### DKIM
Zoho genereert de waarde tijdens setup; plaats als `zmail._domainkey` TXT record.

---

## Kosten

| Item | Kosten/jaar |
|------|-------------|
| Domein (yourhosting, bestaand) | — |
| Hosting (GitHub Pages) | €0 |
| Backend (Supabase free) | €0 |
| E-mail (Zoho free, optioneel) | €0 |
| Google Play | €25 eenmalig |
