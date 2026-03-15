# SchriftInzicht — Scrapers & Data Loader

## Vereisten

```bash
pip install requests beautifulsoup4 supabase python-dotenv
```

## Stappen

### 1. Database opzetten
- Maak een Supabase project aan op https://supabase.com
- Open de SQL Editor
- Plak en voer `schriftinzicht-schema.sql` uit
- Dit maakt alle tabellen aan en laadt de 16 oudvaders als seed data

### 2. Environment instellen
Maak een `.env` bestand in deze map:
```
SUPABASE_URL=https://jouw-project.supabase.co
SUPABASE_KEY=jouw-service-role-key
```
De service_role key vind je in Supabase → Settings → API.

### 3. Scrapen

**Kanttekeningen Statenvertaling:**
```bash
python scrape_kanttekeningen.py
```
- Bron: statenvertaling.net
- Output: `kanttekeningen.json`
- Duur: ~2-3 uur (1189 hoofdstukken, 1.5s per request)

**Matthew Henry:**
```bash
python scrape_matthew_henry.py
```
- Bron: onlinebijbelverklaring.nl (open source)
- Output: `matthew_henry.json`
- Duur: ~3-4 uur
- **TIP**: Check eerst hun GitHub repo voor ruwe brondata!

### 4. Laden in database
```bash
python load_to_supabase.py
```
Dit laadt alle gescrapete JSON-bestanden in je Supabase database.

## Belangrijk

- De scrapers bevatten een ingebouwde vertraging (1.5-2 sec) om de bronservers te respecteren.
- Controleer altijd de HTML-structuur van de bronsite — CSS-selectors moeten mogelijk aangepast worden.
- Alle bronnen zijn publiek domein. Wees desondanks netjes met scraping.
- De scraper voor de Kanttekeningen moet mogelijk aangepast worden aan de specifieke HTML-structuur van statenvertaling.net. Inspecteer de pagina eerst handmatig.

## Volgende bronnen om toe te voegen

| Bron | Status | Prioriteit |
|------|--------|------------|
| Kanttekeningen SV | Script klaar | Hoog |
| Matthew Henry | Script klaar | Hoog |
| Dächsel | Beschikbaar op theologienet.nl als PDF/EPUB | Middel |
| Calvijn (NL) | Deels op onlinebible.com (abonnement) | Middel |
| Heidelbergse Catechismus | Vrij beschikbaar | Hoog |
| Spurgeon (Schatkamer) | Engelstalig publiek domein | Laag |
