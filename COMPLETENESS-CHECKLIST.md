# SchriftInzicht -- Completeness Checklist Oudvaders

**Datum:** 15 maart 2026
**Bron:** Inventarisatie 11 maart + actuele bestandscontrole 15 maart 2026

---

## Legenda

- **Lokaal comm.** = commentary items in lokale JSON-bestanden
- **Lokaal serm.** = sermon items in lokale JSON-bestanden
- **DB comm.** = commentary items in Supabase
- **DB serm.** = sermon items in Supabase
- **Sync %** = percentage van lokale items dat in DB staat
- Items gemarkeerd met (EN) zijn Engelstalig

---

## 1. Per-Auteur Status

### 1.1 Wilhelmus a Brakel (1635-1711)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 1.849 (4 bestanden) |
| Lokaal serm. | 841 (2 bestanden) |
| DB comm. | 700 |
| DB serm. | 690 |
| **Sync comm.** | **37,9%** |
| **Sync serm.** | **82,0%** |
| Compleetheid oeuvre | 65-70% |

**Bestanden:**
- [x] brakel.json (662) -- korte fragmenten
- [x] brakel_extra.json (848) -- lange hoofdstukken RGD
- [x] brakel_extra2.json (231) -- source_collection: "Redelijke Godsdienst"
- [x] brakel_remaining.json (108) -- RGD (PDF)
- [x] sermons_brakel.json (424)
- [x] sermons_extra_brakel_extra.json (417)

**Ontbrekende werken:**
- [ ] *De Ware Christen* -- niet gedigitaliseerd
- [ ] *Trappen des Geestelijken Levens* -- niet gedigitaliseerd
- [ ] Aanvullende brieven en catechismusverklaringen

**Kwaliteit:**
- Geen ernstige problemen
- `verse_end` consistent null
- Sommige entries in _extra zijn complete hoofdstukken (10.000+ tekens)

**Actie:** 1.149 commentaar-items + 151 preek-items uploaden naar DB

---

### 1.2 Thomas Boston (1676-1732)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 547 (3 bestanden) |
| Lokaal serm. | 105 (1 bestand) |
| DB comm. | 204 |
| DB serm. | 78 |
| **Sync comm.** | **37,3%** |
| **Sync serm.** | **74,3%** |
| Compleetheid oeuvre | 20-30% |

**Bestanden:**
- [x] boston.json (237) -- "De Viervoudige Staat"
- [x] boston_extra.json (239) -- afwijkende veldvolgorde
- [x] boston_remaining.json (71)
- [x] sermons_boston.json (105) -- Bron: "Zevenentallen"

**Ontbrekende werken:**
- [ ] *Crook in the Lot* (NL vertaling)
- [ ] *Body of Divinity*
- [ ] 10 resterende delen van zijn verzameld werk

**Kwaliteit:** Goed. Nederlandse vertalingen.

**Actie:** 343 commentaar-items + 27 preek-items uploaden naar DB

---

### 1.3 Alexander Comrie (1706-1774)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 242 (3 bestanden) |
| Lokaal serm. | 137 (1 bestand) |
| DB comm. | 116 |
| DB serm. | 113 |
| **Sync comm.** | **47,9%** |
| **Sync serm.** | **82,5%** |
| Compleetheid oeuvre | 50-60% |

**Bestanden:**
- [x] comrie.json (89)
- [x] comrie_extra.json (91)
- [x] comrie_extra2.json (62)
- [x] sermons_comrie.json (137) -- Bron: "Leerredenen"

**Ontbrekende werken:**
- [ ] *Verhandeling van de Eigenschappen Gods* (14 preken)
- [ ] *Brief over de Rechtvaardigmaking*
- [ ] *Examen van het Ontwerp van Tolerantie* (3 delen)

**Kwaliteit:** Goed.

**Bron:** theologienet.nl heeft Comrie-werken beschikbaar

**Actie:** 126 commentaar-items + 24 preek-items uploaden naar DB

---

### 1.4 Abraham Hellenbroek (1658-1731)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 591 (3 bestanden) |
| Lokaal serm. | 266 (2 bestanden) |
| DB comm. | 223 |
| DB serm. | 17 |
| **Sync comm.** | **37,7%** |
| **Sync serm.** | **6,4%** |
| Compleetheid oeuvre | **30-40% -- KRITIEK** |

**Bestanden:**
- [x] hellenbroek.json (271)
- [x] hellenbroek_extra.json (306)
- [ ] hellenbroek_extra2.json (14) -- opvallend klein, controleren
- [x] sermons_hellenbroek.json (42)
- [x] sermons_extra_hellenbroek_extra.json (224)

**Ontbrekende werken (GROOT):**
- [ ] *De Evangelische Jesaia* (6 delen, 212 redevoeringen) -- **HOOFDWERK, ontbreekt volledig**
- [ ] *Het Hooglied van Salomo* (4 delen)
- [ ] *De Kruistriomf* (48 preken)
- [ ] *Bijbelse Keurstoffen* (4 delen)

**Kwaliteit:**
- hellenbroek_extra2.json bevat slechts 14 items -- mogelijk incompleet parsed
- Preken-sync extreem laag (6,4%)

**Bron:** Stichting Gereformeerd Erfgoed (standaardeditie 16 delen), theologienet.nl

**Actie:** PRIORITEIT 1 -- 368 comm + 249 serm uploaden. Daarna ontbrekende werken digitaliseren.

---

### 1.5 H.F. Kohlbrugge (1803-1875)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 462 (4 bestanden) |
| Lokaal serm. | 530 (2 bestanden) |
| DB comm. | 294 |
| DB serm. | 332 |
| **Sync comm.** | **63,6%** |
| **Sync serm.** | **62,6%** |
| Compleetheid oeuvre | 50-60% |

**Bestanden:**
- [x] kohlbrugge.json (44) -- afwijkende veldvolgorde
- [x] kohlbrugge_extra.json (43)
- [ ] kohlbrugge_new.json (349) -- **STUB-ENTRIES** (alleen koppen, geen tekst)
- [x] kohlbrugge_remaining.json (26)
- [x] sermons_kohlbrugge.json (380)
- [x] sermons_extra_kohlbrugge_extra.json (150)

**Kwaliteitsproblemen:**
- kohlbrugge_new.json: 349 stub-entries (titels zonder commentaartekst) -- **moet eerst gevuld of verwijderd worden**

**Actie:** Stub-entries fixen of uitsluiten. Dan 168 comm + 198 serm uploaden.

---

### 1.6 Bernardus Smijtegelt (1665-1739)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 352 (2 bestanden) |
| Lokaal serm. | 1.661 (2 bestanden) |
| DB comm. | 284 |
| DB serm. | 207 |
| **Sync comm.** | **80,7%** |
| **Sync serm.** | **12,5%** |
| Compleetheid oeuvre | **45-55%** |

**Bestanden:**
- [ ] smijtegelt.json (8) -- **extreem klein, bijna leeg**
- [x] smijtegelt_new.json (344)
- [x] sermons_smijtegelt.json (695)
- [x] sermons_extra_smijtegelt_extra.json (966)

**Ontbrekende werken:**
- [ ] *Keurstoffen* (50 preken)
- [ ] *Een Woord op Zijn Tijd* (4 delen, 87 preken)
- [ ] Heidelbergse Catechismus-verklaring (52 preken)
- Totaal ~189 preken die ontbreken

**Kwaliteitsproblemen:**
- smijtegelt.json bevat slechts 8 items -- basisbestand extreem schaars
- Preken-sync dramatisch laag (12,5%) -- 1.454 preken niet in DB

**Bron:** theologienet.nl heeft "50 uitnemende predikaties" (EPUB/DOCX/PDF)

**Actie:** PRIORITEIT 2 -- 1.454 preken uploaden naar DB. Ontbrekende werken downloaden van theologienet.nl.

---

### 1.7 Theodorus van der Groe (1705-1784)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 214 (3 bestanden) |
| Lokaal serm. | 283 (1 bestand) |
| DB comm. | 142 |
| DB serm. | 201 |
| **Sync comm.** | **66,4%** |
| **Sync serm.** | **71,0%** |
| Compleetheid oeuvre | 50-60% |

**Bestanden:**
- [x] vandergroe.json (23)
- [x] vandergroe_extra.json (17)
- [x] vandergroe_new.json (174)
- [x] sermons_vandergroe.json (283) -- Bron: "50 Keurstoffen"

**Ontbrekende werken:**
- [ ] *Toetssteen van Ware en Valse Genade* (3 delen) -- **BEKENDSTE WERK, ontbreekt**
- [ ] Heidelbergse Catechismus-verklaring
- [ ] *48 Lijdenspreken*

**Bron:** theologienet.nl (3 delen PDF)

**Actie:** 72 comm + 82 serm uploaden. Daarna ontbrekende werken ophalen.

---

### 1.8 Johannes Calvijn (1509-1564)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. (NL) | ~680 (excl. calvijn.json EN) |
| Lokaal comm. (EN) | 14.031 (calvijn.json) |
| Lokaal serm. | 166 (3 bestanden) |
| DB comm. | 12.598 |
| DB serm. | 131 |
| **Sync comm.** | **85,7%** (incl. EN) |
| **Sync serm.** | **78,9%** |
| Compleetheid oeuvre | 40-50% |

**Bestanden:**
- [ ] calvijn.json (14.031) -- **VOLLEDIG ENGELS** (backup: calvijn_en_backup.json)
- [x] calvijn_extra.json (55) -- Nederlands (Genesis)
- [x] calvijn_extra2.json (41) -- Nederlands
- [x] calvijn_new.json (270) -- Nederlands
- [ ] calvijn_nl_parsed.json (269) -- **mogelijke duplicaat van calvijn_extra**
- [x] calvijn_psalmen.json (41) -- Nederlands, kort
- [x] calvijn_remaining.json (4) -- zeer klein
- [ ] calvijn_preken.json (22) -- **ernstige OCR-artefacten** (backup: calvijn_preken_backup.json)
- [x] sermons_calvijn.json (26)
- [x] sermons_extra_calvijn_extra.json (118)
- [x] calvijn_nl_all.json (716) -- **NIEUW** geconsolideerd NL bestand
- [x] calvijn_nl_ocr_entries.json (516) -- **NIEUW** OCR-resultaten
- [ ] calvijn_nl_progress.json -- dict (voortgangsbestand, geen data)

**Kwaliteitsproblemen -- KRITIEK:**
1. Hoofdbestand (14.031 items, 39MB) is volledig **Engels** -- niet bruikbaar als NL commentaar
2. calvijn_preken.json heeft ernstige OCR-artefacten -- opnieuw OCR'en nodig
3. Mogelijke duplicaten: calvijn_nl_parsed (269) vs calvijn_extra (55) -- overlap controleren
4. calvijn_nl_all.json (716) en calvijn_nl_ocr_entries.json (516) zijn nieuwe bestanden die niet in de originele inventaris staan -- relatie tot andere bestanden onduidelijk

**Actie:** NL-bestanden consolideren. Engelse data scheiden. OCR-artefacten opruimen. Duplicaten verwijderen.

---

### 1.9 John Bunyan (1628-1688)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 414 (4 bestanden) |
| Lokaal serm. | 302 (1 bestand) |
| DB comm. | 231 |
| DB serm. | 218 |
| **Sync comm.** | **55,8%** |
| **Sync serm.** | **72,2%** |
| Compleetheid oeuvre | 15-25% |

**Bestanden:**
- [x] bunyan.json (91) -- "Christenreize" passages
- [x] bunyan_extra.json (84)
- [x] bunyan_extra2.json (185)
- [x] bunyan_remaining.json (54)
- [ ] sermons_bunyan.json (302) -- **STUB-ENTRIES** (alleen titels, geen volledige tekst)

**Ontbrekende werken:**
- [ ] *The Holy War* (NL vertaling)
- [ ] *Grace Abounding to the Chief of Sinners* (NL vertaling)
- [ ] *The Life and Death of Mr. Badman* (NL vertaling)
- 55 andere titels van Bunyans 58 totale werken

**Kwaliteitsproblemen:**
- sermons_bunyan.json: stub-entries -- titels zonder volledige tekst

**Actie:** Stub-entries in sermons fixen. 183 comm + 84 serm uploaden.

---

### 1.10 C.H. Spurgeon (1834-1892)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. (NL) | 339 (3 bestanden) |
| Lokaal comm. (EN) | 2.337 (spurgeon.json) |
| Lokaal serm. | 286 (2 bestanden) |
| DB comm. | 2.304 |
| DB serm. | 31 |
| **Sync comm.** | **86,1%** (incl. EN) |
| **Sync serm.** | **10,8%** |
| Compleetheid oeuvre | 5-10% |

**Bestanden:**
- [ ] spurgeon.json (2.337) -- **VOLLEDIG ENGELS** (Treasury of David)
- [x] spurgeon_nl.json (92) -- Nederlands, lange entries
- [x] spurgeon_new.json (93) -- Nederlands
- [x] spurgeon_extra3.json (154) -- Nederlands
- [x] sermons_spurgeon.json (185)
- [ ] sermons_extra_spurgeon_extra.json (101) -- **VERKEERDE AUTEUR: Isaac Ambrose**

**Kwaliteitsproblemen -- KRITIEK:**
1. Hoofdbestand (2.337) is volledig **Engels**
2. sermons_extra_spurgeon_extra.json bevat werk van **Isaac Ambrose** ("Het Zien op Jezus") -- **verkeerd geattribueerd**
3. Preken-sync extreem laag (10,8%)

**Bron:** spurgeongems.org (alle 3.561 preken -- Engels); theologienet.nl heeft NL vertaling

**Actie:** Attributie-fix doorvoeren. NL/EN scheiden. 255 preken uploaden naar DB.

---

### 1.11 Maarten Luther (1483-1546)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 198 (5 best., 2 leeg) |
| Lokaal serm. | 26 (1 bestand) |
| DB comm. | 170 |
| DB serm. | 21 |
| **Sync comm.** | **85,9%** |
| **Sync serm.** | **80,8%** |
| Compleetheid oeuvre | 45-55% |

**Bestanden:**
- [x] luther_full.json (160) -- Galaten-commentaar (was 88, nu 160 -- data toegevoegd)
- [x] luther_extra2.json (20)
- [x] luther_remaining.json (18)
- [x] luther_galaten_online.json (0) -- **GELEEGD** (was 134, duplicaat opgeruimd)
- [x] luther_new.json (0) -- **LEEG** (2 bytes)
- [x] sermons_luther.json (26)
- [x] luther_full_backup.json (88) -- backup van originele data
- [x] luther_galaten_online_backup.json (134) -- backup van geleegd bestand

**Wijzigingen t.o.v. inventaris:**
- luther_full.json: 88 -> 160 items (data uit luther_galaten_online gemerged)
- luther_galaten_online.json: 134 -> 0 items (duplicaat opgeruimd, backup gemaakt)
- Netto: data geconsolideerd, duplicaten verwijderd

**Actie:** Lege bestanden opruimen. 28 comm + 5 serm uploaden.

---

### 1.12 Isaac da Costa (1798-1860)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 705 (4 bestanden) |
| Lokaal serm. | 0 |
| DB comm. | 20 |
| DB serm. | 0 |
| **Sync comm.** | **2,8%** |
| Compleetheid oeuvre | 40-50% |

**Bestanden:**
- [x] dacosta.json (18)
- [x] dacosta_extra.json (11)
- [x] dacosta_remaining.json (13)
- [x] dacosta_bijbellezingen.json (663) -- kwalitatief hoogwaardig

**Ontbrekende werken:**
- [ ] *Bezwaren tegen de Geest der Eeuw*
- [ ] Gedichten
- [ ] Overige theologische essays

**Kwaliteitsproblemen:**
- Sync dramatisch laag (2,8%) -- slechts 20 van 705 items in DB

**Actie:** PRIORITEIT -- 685 items uploaden naar DB (vooral bijbellezingen).

---

### 1.13 K.A. Dachsel (1820-1882)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 52.732 (2 bestanden) |
| Lokaal serm. | 0 |
| DB comm. | 21.909 |
| DB serm. | 0 |
| **Sync comm.** | **41,5%** |
| Compleetheid oeuvre | 85-95% |

**Bestanden:**
- [x] dachsel_extra.json (1.216) -- gebruikt `verse_end` goed
- [x] dachsel_studylight.json (51.516) -- 85MB, bevat duplicaten

**Kwaliteitsproblemen:**
- Intra-file duplicaten in dachsel_studylight.json (bijv. Gen 1:1 komt 2x voor)
- Extreem groot bestand (85MB)
- 30.823 items ontbreken in DB

**Actie:** Deduplicatie uitvoeren. Resterende 30.823 items uploaden naar DB.

---

### 1.14 Gisbertus Voetius (1589-1676)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 41 (2 bestanden) |
| Lokaal serm. | 11 (1 bestand) |
| DB comm. | 31 |
| DB serm. | 8 |
| **Sync comm.** | **75,6%** |
| **Sync serm.** | **72,7%** |
| Compleetheid oeuvre | 20-30% |

**Bestanden:**
- [x] voetius.json (6)
- [x] voetius_extra2.json (35)
- [x] sermons_voetius.json (11)

**Opmerking:** Hoofdwerken in Latijn, Nederlandse vertalingen schaars. Uitbreiding beperkt haalbaar.

**Actie:** 10 comm + 3 serm uploaden.

---

### 1.15 Theodorus Beza (1519-1605)

| Metriek | Waarde |
|---------|--------|
| Lokaal comm. | 6 (1 bestand) |
| DB comm. | 0 |
| **Sync comm.** | **0%** |
| Compleetheid oeuvre | 30-40% |

**Bestanden:**
- [x] beza.json (6) -- minimaal

**Opmerking:** Primair Latijn. Uitbreiding beperkt haalbaar.

**Actie:** 6 items uploaden naar DB.

---

### 1.16 Kerkvaders en Historisch

| Bestand | Items | Status |
|---------|-------|--------|
| sermons_extra_ambrosius.json | 0 | GELEEGD (was 241) |
| sermons_extra_isaac_ambrose.json | 241 | **NIEUW** -- correcte attributie |
| sermons_extra_apostolisch.json | 61 | OK |
| sermons_extra_augustinus.json | 51 | OK -- Belijdenissen + indexen |
| sermons_extra_athanasius.json | 0 | LEEG |

**Wijzigingen t.o.v. inventaris:**
- Isaac Ambrose data is verplaatst van `sermons_extra_ambrosius.json` (nu leeg) naar `sermons_extra_isaac_ambrose.json` (241 items)
- Attributie-fix deels doorgevoerd

**DB status:**
- Ambrosius/Ambrose in DB: 194 preken -- attributie in DB ook controleren

---

### 1.17 Matthew Henry (1662-1714)

| Metriek | Waarde |
|---------|--------|
| Lokaal | 0 (geen JSON-bestanden) |
| DB comm. | 3.796 |
| **Sync** | n.v.t. -- alleen in DB |

**Opmerking:** Staat wel in database maar heeft geen lokale bronbestanden. Bron onduidelijk.

---

## 2. Totaaloverzicht

### 2.1 Lokale data vs Database

| Auteur | Lokaal totaal | DB totaal | Te uploaden | Sync % |
|--------|--------------|-----------|-------------|--------|
| Dachsel | 52.732 | 21.909 | 30.823 | 41,5% |
| Calvijn | 14.877 | 12.729 | 2.148 | 85,6% |
| Spurgeon | 2.962 | 2.335 | 627 | 78,8% |
| Brakel | 2.690 | 1.390 | 1.300 | 51,7% |
| Smijtegelt | 2.013 | 491 | 1.522 | 24,4% |
| Kohlbrugge | 992 | 626 | 366 | 63,1% |
| Hellenbroek | 857 | 240 | 617 | 28,0% |
| Bunyan | 716 | 449 | 267 | 62,7% |
| Da Costa | 705 | 20 | 685 | 2,8% |
| Boston | 652 | 282 | 370 | 43,3% |
| Van der Groe | 497 | 343 | 154 | 69,0% |
| Comrie | 379 | 229 | 150 | 60,4% |
| Isaac Ambrose | 241 | 194 | 47 | 80,5% |
| Luther | 224 | 191 | 33 | 85,3% |
| Augustinus | 51 | 1 | 50 | 2,0% |
| Voetius | 52 | 39 | 13 | 75,0% |
| Apostolisch | 61 | 0 | 61 | 0% |
| Beza | 6 | 0 | 6 | 0% |
| Matthew Henry | 0 (lokaal) | 3.796 | -- | DB only |
| **TOTAAL** | **79.707** | **45.264** | **39.238** | **51,5%** |

### 2.2 Compleetheid Oeuvre (geschat)

| Prioriteit | Auteur | Compleetheid | Opmerking |
|------------|--------|-------------|-----------|
| COMPLEET | K.A. Dachsel | 85-95% | Bijbelverklaring nagenoeg volledig |
| HOOG | Brakel | 65-70% | RGD compleet, 2 werken ontbreken |
| HOOG | Comrie | 50-60% | 3 werken ontbreken |
| HOOG | Van der Groe | 50-60% | Hoofdwerk (Toetssteen) ontbreekt |
| HOOG | Kohlbrugge | 50-60% | Stub-entries probleem |
| HOOG | Smijtegelt | 45-55% | ~189 preken ontbreken |
| MIDDEL | Luther | 45-55% | Oeuvre enorm |
| MIDDEL | Da Costa | 40-50% | Sync dramatisch laag |
| MIDDEL | Calvijn | 40-50% | Hoofdbestand is Engels |
| KRITIEK | Hellenbroek | 30-40% | Hoofdwerk volledig absent |
| LAAG | Beza | 30-40% | Primair Latijn |
| LAAG | Boston | 20-30% | 10 delen ontbreken |
| LAAG | Voetius | 20-30% | Latijn |
| LAAG | Bunyan | 15-25% | 55 titels ontbreken |
| LAAG | Spurgeon | 5-10% | 3.561 preken -- onhaalbaar volledig |

---

## 3. Kwaliteitsproblemen (gerankt)

### KRITIEK

| # | Probleem | Bestanden | Impact |
|---|----------|-----------|--------|
| 1 | **Engelstalige data in NL project** | calvijn.json (14.031), spurgeon.json (2.337) | 16.368 items in verkeerde taal |
| 2 | **Verkeerde attributie Spurgeon** | sermons_extra_spurgeon_extra.json (101) | Isaac Ambrose als Spurgeon in DB |
| 3 | **OCR-artefacten** | calvijn_preken.json (22) | Onleesbare tekst |

### HOOG

| # | Probleem | Bestanden | Impact |
|---|----------|-----------|--------|
| 4 | **Stub-entries (geen tekst)** | kohlbrugge_new.json (349), sermons_bunyan.json (302) | 651 holle entries |
| 5 | **DB sync <30%** | Da Costa (2,8%), Augustinus (2,0%), Smijtegelt (24,4%), Hellenbroek (28,0%) | Grote hoeveelheid data niet beschikbaar in app |
| 6 | **Intra-file duplicaten** | dachsel_studylight.json | Onbekend aantal dubbele entries in 51.516 items |

### MIDDEL

| # | Probleem | Bestanden | Impact |
|---|----------|-----------|--------|
| 7 | **Mogelijke inter-file duplicaten** | calvijn_nl_parsed vs calvijn_extra, calvijn_nl_all overlap | Onduidelijke relaties tussen nieuwe bestanden |
| 8 | **Extreem schaarse data** | smijtegelt.json (8), beza.json (6), voetius.json (6) | Minimale dekking |
| 9 | **verse_end altijd null** | Alle bestanden behalve dachsel_extra | Versreeksen niet ondersteund |
| 10 | **Attributie Ambrosius in DB** | DB bevat 194 preken onder "Ambrosius" | Moet naar Isaac Ambrose |

### LAAG

| # | Probleem | Bestanden | Impact |
|---|----------|-----------|--------|
| 11 | **Lege bestanden** | luther_new.json, sermons_extra_athanasius.json, luther_galaten_online.json, sermons_extra_ambrosius.json | Opruimen |

---

## 4. Nieuwe bestanden (niet in inventaris 11 maart)

De volgende bestanden zijn na de inventaris verschenen of gewijzigd:

| Bestand | Items | Status |
|---------|-------|--------|
| calvijn_nl_all.json | 716 | NIEUW -- geconsolideerd NL commentaar |
| calvijn_nl_ocr_entries.json | 516 | NIEUW -- OCR-resultaten |
| calvijn_nl_progress.json | dict | NIEUW -- voortgangsbestand (geen data) |
| calvijn_en_backup.json | 14.031 | NIEUW -- backup van Engels bestand |
| calvijn_preken_backup.json | 22 | NIEUW -- backup van OCR-preken |
| luther_full_backup.json | 88 | NIEUW -- backup originele data |
| luther_galaten_online_backup.json | 134 | NIEUW -- backup voor dedup |
| sermons_extra_isaac_ambrose.json | 241 | NIEUW -- attributie-fix |
| ocr_cache_*.json | 5 bestanden | NIEUW -- OCR caches (Calvijn vertaalproject) |
| ocr_calvijn_progress.json | 1 bestand | NIEUW -- OCR voortgang |

**Analyse:** Er is duidelijk een Calvijn-vertaalproject geweest (EN -> NL OCR), met backups en voortgangsbestanden. De Luther-duplicaten zijn opgeruimd (gemerged naar luther_full.json). De Isaac Ambrose attributie-fix is deels doorgevoerd.

---

## 5. Bronnen voor Ontbrekende Werken

### Online (gratis)

| Bron | URL | Beschikbare auteurs | Formaat |
|------|-----|---------------------|---------|
| Theologienet | theologienet.nl | Brakel, Smijtegelt, Boston, Spurgeon, Comrie, Hellenbroek, Van der Groe, Luther, Calvijn, Da Costa, Bunyan, Kohlbrugge, Voetius | PDF/EPUB/DOCX |
| DBNL | dbnl.org | Calvijn (Institutie), Da Costa, Voetius | PDF/XML |
| Archive.org | archive.org | Latijnse originelen, Engelse puriteinse werken | Diverse |
| StudyLight | studylight.org | Dachsel bijbelcommentaar | Online |
| SpurgeonGems | spurgeongems.org | Alle 3.561 Spurgeon-preken (Engels) | Online |
| MaartenLuther-NL | maartenluther-nl.com | Luther in het Nederlands | Online |
| Monergism | monergism.com | Bunyan, Boston (Engels) | Online |

### Specifiek beschikbaar op theologienet.nl (geverifieerd)

- Brakel -- *De Redelijke Godsdienst* deel 1 (EPUB/DOCX/PDF)
- Smijtegelt -- *50 uitnemende predikaties* (EPUB/DOCX/PDF)
- Boston -- *Haast u om uws levens wil* (EPUB/PDF)
- Spurgeon -- *Rondom de poort tot de smalle weg* (DOCX/PDF)
- Matthew Henry -- *Verklaring OT: Psalmen* (EPUB/DOCX/PDF)

### Commercieel

| Bron | Relevant voor |
|------|---------------|
| gereformeerderfgoed.nl | Hellenbroek complete werken (16 delen) |
| hertog.nl / debanier.nl | Hertaalde edities diverse auteurs |
| Reveil-serie | Hertaalde losse preken |

### Reformata.nl

Website (reformata.nl) was niet bereikbaar via WebFetch (JavaScript-gerenderd). Handmatig controleren op beschikbare PDF/tekst downloads.

---

## 6. Actieplan (prioriteit)

### Fase 0: Data-opschoning (direct)

- [ ] Lege bestanden verwijderen: `luther_new.json`, `sermons_extra_athanasius.json`, `luther_galaten_online.json`, `sermons_extra_ambrosius.json`
- [ ] Attributie Spurgeon -> Isaac Ambrose fixen in DB (101 items in sermons_extra_spurgeon_extra.json)
- [ ] Attributie Ambrosius -> Isaac Ambrose fixen in DB (194 items)
- [ ] Stub-entries aanpakken: kohlbrugge_new.json (349), sermons_bunyan.json (302)
- [ ] Duplicaten in dachsel_studylight.json detecteren en verwijderen
- [ ] Relatie calvijn_nl_all.json / calvijn_nl_ocr_entries.json / calvijn_nl_parsed.json / calvijn_extra.json uitzoeken
- [ ] OCR-cache bestanden en progress-bestanden verplaatsen naar aparte directory

### Fase 1: DB Sync (week 1)

Hoogste impact -- meeste data al lokaal beschikbaar maar niet in DB:

| Prioriteit | Auteur | Te uploaden | Reden |
|------------|--------|-------------|-------|
| 1 | Da Costa | 685 | Sync 2,8% -- vrijwel niets in DB |
| 2 | Smijtegelt preken | 1.454 | Sync 12,5% -- bulk preken ontbreekt |
| 3 | Dachsel | 30.823 | Sync 41,5% -- grootste absolute gat |
| 4 | Brakel | 1.300 | Sync 51,7% |
| 5 | Hellenbroek | 617 | Sync 28,0% |
| 6 | Boston | 370 | Sync 43,3% |
| 7 | Spurgeon preken | 255 | Sync 10,8% (preken) |
| 8 | Overige | ~494 | Bunyan, Kohlbrugge, Van der Groe, Comrie, etc. |

**Totaal te uploaden: ~35.998 items**

### Fase 2: Consolidatie (week 2)

- [ ] Per auteur alle _extra/_extra2/_remaining/_new samenvoegen tot 1 bestand per type
- [ ] Mappenstructuur data/authors/{slug}/ invoeren
- [ ] Metadata toevoegen: author_id, source_work_id, language
- [ ] EN/NL splitsing voor Calvijn en Spurgeon

### Fase 3: Ontbrekende Werken (week 3-4)

| Prioriteit | Auteur | Werk | Bron |
|------------|--------|------|------|
| 1 | Hellenbroek | *De Evangelische Jesaia* (6 dl, 212 redev.) | gereformeerderfgoed.nl |
| 2 | Smijtegelt | *Keurstoffen* + *Een Woord op Zijn Tijd* + HC (189 preken) | theologienet.nl |
| 3 | Van der Groe | *Toetssteen van Ware en Valse Genade* (3 dl) | theologienet.nl |
| 4 | Comrie | *Verhandeling Eigenschappen* + *Brief Rechtvaardigmaking* | theologienet.nl |
| 5 | Brakel | *De Ware Christen* + *Trappen des Geestelijken Levens* | theologienet.nl |

### Fase 4: Kwaliteitsverbetering (lopend)

- [ ] OCR opnieuw uitvoeren voor calvijn_preken.json
- [ ] verse_end vullen waar mogelijk
- [ ] Titels genereren voor entries zonder titel
- [ ] Theologische tags toevoegen
- [ ] Bijbelverwijzingen in tekst detecteren

---

## 7. Ontbrekende Auteurs (te overwegen)

Prominente oudvaders die nog niet in het project zitten:

| Auteur | Periode | Bekendste werk | Haalbaarheid |
|--------|---------|----------------|-------------|
| Willem Teellinck | 1579-1629 | *De Nieuwe Creature* | Hoog (theologienet.nl) |
| Jodocus van Lodenstein | 1620-1677 | *Beschouwingen van Sion* | Middel |
| Petrus van Mastricht | 1630-1706 | *Theoretico-Practica Theologia* | Laag (Latijn) |
| Herman Witsius | 1636-1708 | *De Verbonden* | Middel |
| Jacobus Koelman | 1631-1695 | Diverse | Middel |
| Guiljelmus Saldenus | 1627-1694 | Diverse | Laag |

---

*Checklist gegenereerd door Dex -- SchriftInzicht Digitaliseringsproject*
