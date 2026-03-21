# SchriftInzicht — Inventaris Oudvaders-Literatuur

**Datum:** 11 maart 2026
**Doel:** Volledige inventarisatie, verificatie en consolidatieplan voor het digitaliseringsproject.

---

## STAP 1 — INVENTARIS (Lokale bestanden + Database)

### 1.1 Overzicht Lokale JSON-bestanden

Er zijn **70+ JSON-bestanden** in de project-root met in totaal **~81.700 items**.

**Drie datapatronen:**
- **Patroon A — Commentary (basis):** `{ book, chapter, verse, verse_end, text }` — geen titel of bron
- **Patroon B — Commentary (extra/remaining/new):** Zelfde + soms `title` en `source_collection`
- **Patroon C — Sermons:** `{ title, book, chapter, verse, verse_end, text, source_collection }`

### 1.2 Per-Auteur Inventaris (Lokale bestanden)

#### Wilhelmus à Brakel (1635-1711)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| brakel.json | 662 | Commentary A | Korte fragmenten |
| brakel_extra.json | 848 | Commentary B | Lange hoofdstukken uit RGD |
| brakel_extra2.json | 231 | Commentary B | Met `source_collection: "Redelijke Godsdienst"` |
| brakel_remaining.json | 108 | Commentary B | Bron: RGD (PDF) |
| sermons_brakel.json | 424 | Sermons C | |
| sermons_extra_brakel_extra.json | 417 | Sermons C | |
| **Totaal** | **2.690** | | Commentaar + preken |

**Bronbestanden:** brakel_rgd.docx, brakel_rgd.pdf, brakel_rgd2.docx
**Kwaliteit:** Goed. `verse_end` consistent `null`. Sommige entries in _extra zijn complete hoofdstukken (10.000+ tekens).

---

#### Thomas Boston (1676-1732)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| boston.json | 237 | Commentary A | "De Viervoudige Staat" |
| boston_extra.json | 239 | Commentary A | Afwijkende veldvolgorde |
| boston_remaining.json | 71 | Commentary A | |
| sermons_boston.json | 105 | Sermons C | Bron: "Zevenentallen" |
| **Totaal** | **652** | | |

**Bronbestanden:** boston_4staten.docx, boston_7ental_2.docx, boston_7ental_3.docx, boston-thomas_page.html
**Kwaliteit:** Goed. Nederlandse vertalingen.

---

#### Alexander Comrie (1706-1774)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| comrie.json | 89 | Commentary A | |
| comrie_extra.json | 91 | Commentary A | |
| comrie_extra2.json | 62 | Commentary A | |
| sermons_comrie.json | 137 | Sermons C | Bron: "Leerredenen" |
| **Totaal** | **379** | | |

**Bronbestanden:** comrie_11leerredenen.docx, comrie_14preken.docx, comrie_abc.docx/pdf
**Kwaliteit:** Goed.

---

#### Abraham Hellenbroek (1658-1731)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| hellenbroek.json | 271 | Commentary A | |
| hellenbroek_extra.json | 306 | Commentary A | |
| hellenbroek_extra2.json | 14 | Commentary A | Zeer klein |
| sermons_hellenbroek.json | 42 | Sermons C | |
| sermons_extra_hellenbroek_extra.json | 224 | Sermons C | |
| **Totaal** | **857** | | |

**Bronbestanden:** hellenbroek_13adventspreken.docx, hellenbroek_4keurstoffen.docx, hellenbroek_catechisatie.docx/pdf
**Kwaliteit:** Goed. Extra2 is opvallend klein (14 items).

---

#### H.F. Kohlbrugge (1803-1875)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| kohlbrugge.json | 44 | Commentary A | Afwijkende veldvolgorde |
| kohlbrugge_extra.json | 43 | Commentary A | |
| kohlbrugge_new.json | 349 | Commentary A | ⚠️ Stub-entries (alleen koppen, geen tekst) |
| kohlbrugge_remaining.json | 26 | Commentary A | |
| sermons_kohlbrugge.json | 380 | Sermons C | |
| sermons_extra_kohlbrugge_extra.json | 150 | Sermons C | |
| **Totaal** | **992** | | |

**Bronbestanden:** kohlbrugge_galaten.docx/pdf, kohlbrugge_romeinen.docx/pdf
**Kwaliteit:** ⚠️ kohlbrugge_new.json bevat incomplete stub-entries (titels zonder commentaartekst).

---

#### Bernardus Smijtegelt (1665-1739)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| smijtegelt.json | 8 | Commentary A | ⚠️ Slechts 8 items |
| smijtegelt_new.json | 344 | Commentary A | |
| sermons_smijtegelt.json | 695 | Sermons C | |
| sermons_extra_smijtegelt_extra.json | 966 | Sermons C | |
| **Totaal** | **2.013** | | Overwegend preken |

**Bronbestanden:** smytegelt-deel-1.pdf, smijtegelt_page.html (3×)
**Kwaliteit:** Basisbestand extreem klein (8 items). Bulk is preken (1.661 items).

---

#### Theodorus van der Groe (1705-1784)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| vandergroe.json | 23 | Commentary A | |
| vandergroe_extra.json | 17 | Commentary A | |
| vandergroe_new.json | 174 | Commentary A | |
| sermons_vandergroe.json | 283 | Sermons C | Bron: "50 Keurstoffen" |
| **Totaal** | **497** | | Preken-zwaar |

**Bronbestanden:** vandergroe_leerredenen.docx/pdf
**Kwaliteit:** Goed. Keurstoffen zijn goed gestructureerd.

---

#### Johannes Calvijn (1509-1564)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| calvijn.json | 14.031 | Commentary A | ⚠️ **ENGELS** |
| calvijn_extra.json | 55 | Commentary A | Nederlands (Genesis) |
| calvijn_extra2.json | ~60 | Commentary A | |
| calvijn_new.json | 270 | Commentary A | Nederlands |
| calvijn_nl_parsed.json | 269 | Commentary A | ⚠️ Duplicaat van calvijn_extra? |
| calvijn_preken.json | 22 | Sermons A | ⚠️ **Ernstige OCR-artefacten** |
| calvijn_psalmen.json | 41 | Commentary A | Nederlands, kort |
| calvijn_remaining.json | ~50 | Commentary A | |
| sermons_calvijn.json | 26 | Sermons C | |
| sermons_extra_calvijn_extra.json | 118 | Sermons C | |
| **Totaal** | **~14.832** | | Overwegend commentaar |

**Bronbestanden:** calvijn_11preken_1samuel.docx, calvijn_27preken_jeremia.docx, calvijn_genesis.docx, calvijn_kerstpreken.docx, calvijn_romeinen.epub
**Kwaliteit:** ⚠️ **KRITIEK**: Hoofdbestand (14.031 items, 39MB) is volledig in het **Engels**. OCR-artefacten in calvijn_preken.json. Mogelijke duplicaten calvijn_nl_parsed ↔ calvijn_extra.

---

#### John Bunyan (1628-1688)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| bunyan.json | 91 | Commentary A | "Christenreize" passages |
| bunyan_extra.json | 84 | Commentary A | |
| bunyan_extra2.json | 185 | Commentary A | |
| bunyan_remaining.json | 54 | Commentary A | |
| sermons_bunyan.json | 302 | Sermons C | ⚠️ Stub-entries (alleen titels) |
| **Totaal** | **716** | | |

**Bronbestanden:** bunyan_christenreis.docx, bunyan_christinnereis.docx, bunyan_werken_1/2.docx, bunyan-christenreis.pdf, bunyan-komen-en-welkom.pdf
**Kwaliteit:** ⚠️ sermons_bunyan.json bevat stub-entries (titels zonder volledige tekst).

---

#### C.H. Spurgeon (1834-1892)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| spurgeon.json | 2.337 | Commentary A | ⚠️ **ENGELS** (Treasury of David) |
| spurgeon_nl.json | 92 | Commentary A | Nederlands, lange entries |
| spurgeon_new.json | 93 | Commentary A | Nederlands |
| spurgeon_extra3.json | 154 | Commentary A | Nederlands |
| sermons_spurgeon.json | 185 | Sermons C | |
| sermons_extra_spurgeon_extra.json | 101 | Sermons C | ⚠️ **VERKEERDE AUTEUR** (Isaac Ambrose) |
| **Totaal** | **2.962** | | |

**Bronbestanden:** spurgeon_johannes.docx, spurgeon_lukas.docx, spurgeon_markus.docx, spurgeon_mattheus.docx, spurgeon_nt.docx, spurgeon_ot.docx, + 8 andere .docx
**Kwaliteit:** ⚠️ **KRITIEK**: Hoofdbestand in het Engels. sermons_extra_spurgeon_extra.json bevat werk van **Isaac Ambrose** ("Het Zien op Jezus"), niet van Spurgeon — **verkeerd geattribueerd**.

---

#### Maarten Luther (1483-1546)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| luther_full.json | 88 | Commentary A | Galaten-commentaar |
| luther_extra2.json | 20 | Commentary A | |
| luther_remaining.json | 18 | Commentary A | |
| luther_galaten_online.json | 134 | Commentary A | ⚠️ Duplicaat van luther_full |
| luther_new.json | 0 | Leeg | ⚠️ Leeg bestand (2 bytes) |
| sermons_luther.json | 26 | Sermons C | |
| **Totaal** | **286** | | |

**Bronbestanden:** luther_galaten.docx, luther_kerkpostil1/2/3.docx, luther_psalmen.docx, luther_psalm117_118_127.docx, luther_romeinen.docx
**Kwaliteit:** ⚠️ Duplicaat: luther_full.json ≈ luther_galaten_online.json. luther_new.json is leeg.

---

#### Isaac da Costa (1798-1860)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| dacosta.json | 18 | Commentary A | |
| dacosta_extra.json | 11 | Commentary A | |
| dacosta_remaining.json | 13 | Commentary A | |
| dacosta_bijbellezingen.json | 663 | Commentary A | Kwalitatief hoogwaardig |
| **Totaal** | **705** | | Alleen commentaar |

**Bronbestanden:** dacosta_hagar.docx, dacosta_meijer.docx, dacosta_profetie.docx, dacosta_johannes.pdf
**Kwaliteit:** Goed. Bijbellezingen zijn uitgebreid en rijk.

---

#### K.A. Dachsel (1820-1882)
| Bestand | Items | Type | Opmerkingen |
|---------|-------|------|-------------|
| dachsel_extra.json | 1.216 | Commentary A | Gebruikt `verse_end` goed |
| dachsel_studylight.json | 51.516 | Commentary A | ⚠️ 85MB, bevat duplicaten |
| **Totaal** | **52.732** | | Alleen commentaar |

**Bronbestanden:** dachsel_docx/ (directory), pdfs/ (directory)
**Kwaliteit:** ⚠️ Duplicaat-entries in dachsel_studylight.json (bijv. Gen 1:1 komt 2× voor).

---

#### Theodorus Beza (1519-1605)
| Bestand | Items | Type |
|---------|-------|------|
| beza.json | 6 | Commentary A |
| **Totaal** | **6** | Minimaal |

**Kwaliteit:** Extreem schaars.

---

#### Gisbertus Voetius (1589-1676)
| Bestand | Items | Type |
|---------|-------|------|
| voetius.json | 6 | Commentary A |
| voetius_extra2.json | 35 | Commentary A |
| sermons_voetius.json | 11 | Sermons C |
| **Totaal** | **52** | Klein |

**Bronbestanden:** voetius_preek.docx, voetius_troost.docx
**Kwaliteit:** Klein maar inhoudelijk goed.

---

#### Kerkvaders & Historisch
| Bestand | Items | Opmerkingen |
|---------|-------|-------------|
| sermons_extra_ambrosius.json | 241 | ⚠️ Eigenlijk **Isaac Ambrose** (Puritein), niet kerkvader Ambrosius |
| sermons_extra_apostolisch.json | 61 | Wetenschappelijke tekst over Apostolische Vaders |
| sermons_extra_augustinus.json | 51 | Belijdenissen + indexen, veel referentie-entries |
| sermons_extra_athanasius.json | 0 | Leeg bestand |
| **Totaal** | **353** | |

---

#### Hulpbestanden
| Bestand | Items | Beschrijving |
|---------|-------|-------------|
| bible_books.json | 66 | Bijbelboeken (id, naam, afkorting, volgorde) |
| bible_verses_map.json | — | Vers-mapping (397KB) |
| verse_lookup.json | 31.090 | Vers-index |

---

### 1.3 Supabase Database — Huidige staat

**Database:** mkwqiqssuhunbhvwrsdt.supabase.co

#### Tabellen
| Tabel | Rijen | Status |
|-------|-------|--------|
| bible_verses | 31.090 | ✅ Compleet (SV). ⚠️ HSV kolom leeg |
| bible_books | 66 | ✅ Compleet |
| cross_references | 344.500 | ✅ Groot bestand |
| kanttekeningen | 64.856 | ✅ Statenvertaling kanttekeningen |
| commentaries | 43.022 | ✅ Geladen |
| sermons | 2.242 | ✅ Geladen |
| authors | 18 | ✅ |
| source_works | 18 | ✅ |
| confessions | 3 | ✅ HC, NGB, DL |
| confession_articles | 225 | ✅ |
| confession_proof_texts | 0 | ⚠️ Leeg |
| catechism_questions | 129 | ✅ HC |
| catechism_proof_texts | 1.113 | ✅ |
| bookmarks | 0 | Feature-tabel |
| search_history | 0 | Feature-tabel |
| user_profiles | 0 | Feature-tabel |

#### Commentaren in DB per auteur
| Auteur | In DB | Lokaal | Verschil |
|--------|-------|--------|----------|
| K.A. Dachsel | 21.909 | 52.732 | -30.823 ⚠️ |
| Johannes Calvijn | 12.598 | 14.832 | -2.234 |
| Matthew Henry | 3.796 | n.v.t. | Alleen in DB |
| C.H. Spurgeon | 2.304 | 2.962 | -658 |
| Wilhelmus à Brakel | 700 | 1.849 | -1.149 ⚠️ |
| H.F. Kohlbrugge | 294 | 462 | -168 |
| Bernardus Smijtegelt | 284 | 352 | -68 |
| John Bunyan | 231 | 414 | -183 |
| Abraham Hellenbroek | 223 | 591 | -368 ⚠️ |
| Thomas Boston | 204 | 547 | -343 ⚠️ |
| Maarten Luther | 170 | 260 | -90 |
| Theodorus van der Groe | 142 | 214 | -72 |
| Alexander Comrie | 116 | 242 | -126 |
| Gisbertus Voetius | 31 | 41 | -10 |
| Isaac da Costa | 20 | 705 | -685 ⚠️ |

**⚠️ Grote discrepanties:** Dachsel (-30.823), Da Costa (-685), Brakel (-1.149), Hellenbroek (-368), Boston (-343). Veel lokale data is nog niet in de database geladen.

#### Preken in DB per auteur
| Auteur | In DB | Lokaal | Verschil |
|--------|-------|--------|----------|
| Wilhelmus à Brakel | 690 | 841 | -151 |
| H.F. Kohlbrugge | 332 | 530 | -198 |
| John Bunyan | 218 | 302 | -84 |
| Bernardus Smijtegelt | 207 | 1.661 | -1.454 ⚠️ |
| Theodorus van der Groe | 201 | 283 | -82 |
| Ambrosius/Ambrose | 194 | 241 | -47 |
| Johannes Calvijn | 131 | 144 | -13 |
| Alexander Comrie | 113 | 137 | -24 |
| Thomas Boston | 78 | 105 | -27 |
| C.H. Spurgeon | 31 | 286 | -255 ⚠️ |
| Maarten Luther | 21 | 26 | -5 |
| Abraham Hellenbroek | 17 | 266 | -249 ⚠️ |
| Gisbertus Voetius | 8 | 11 | -3 |

**⚠️ Grote discrepanties:** Smijtegelt (-1.454), Spurgeon (-255), Hellenbroek (-249).

---

### 1.4 Geïdentificeerde Kwaliteitsproblemen

| # | Probleem | Ernst | Bestanden |
|---|----------|-------|-----------|
| 1 | **Taalinconsistentie:** Engelse tekst in Nederlands project | KRITIEK | calvijn.json (14.031), spurgeon.json (2.337) |
| 2 | **Verkeerde attributie:** Isaac Ambrose als Spurgeon | KRITIEK | sermons_extra_spurgeon_extra.json |
| 3 | **Verkeerde attributie:** Isaac Ambrose als Ambrosius (kerkvader) | KRITIEK | sermons_extra_ambrosius.json |
| 4 | **OCR-artefacten:** Onleesbare tekst | HOOG | calvijn_preken.json |
| 5 | **Duplicaten (inter-file):** Zelfde content in 2 bestanden | HOOG | luther_full ↔ luther_galaten_online, calvijn_nl_parsed ↔ calvijn_extra |
| 6 | **Duplicaten (intra-file):** Dubbele entries | MIDDEL | dachsel_studylight.json |
| 7 | **Stub-entries:** Titels zonder tekst | HOOG | kohlbrugge_new.json, sermons_bunyan.json |
| 8 | **Lege bestanden:** 0 items | LAAG | luther_new.json, sermons_extra_athanasius.json |
| 9 | **Sparse data:** <10 items per auteur | MIDDEL | smijtegelt.json (8), beza.json (6), voetius.json (6) |
| 10 | **verse_end altijd null:** Versreeksen niet gebruikt | LAAG | Alle bestanden behalve dachsel_extra |
| 11 | **DB-discrepanties:** Lokale data niet in DB geladen | HOOG | Dachsel (-30K), Da Costa (-685), Smijtegelt preken (-1.454) |

---

## STAP 2 — ONLINE VERIFICATIE (Compleetheid)

### 2.1 Compleetheidsmatrix

| # | Auteur | Compleetheid | Prioriteit | Toelichting |
|---|--------|-------------|------------|-------------|
| 1 | Wilhelmus à Brakel | **65-70%** | HOOG | RGD compleet, maar ontbreken: *De Ware Christen*, *Trappen des Geestelijken Levens* |
| 2 | Bernardus Smijtegelt | **45-55%** | HOOG | Veel ontbreekt: *Keurstoffen* (50 preken), *Een Woord op Zijn Tijd* (4 dl, 87 preken), HC-verklaring (52 preken) |
| 3 | Abraham Hellenbroek | **30-40%** | KRITIEK | Hoofdwerk ontbreekt: *De Evangelische Jesaia* (6 dl, 212 redev.), *Het Hooglied* (4 dl), *De Kruistriomf* (48 preken), *Bijbelse Keurstoffen* (4 dl) |
| 4 | Theodorus van der Groe | **50-60%** | HOOG | Bekendste werk ontbreekt: *Toetssteen van Ware en Valse Genade*, HC-verklaring, *48 Lijdenspreken* |
| 5 | Alexander Comrie | **50-60%** | MIDDEL | Ontbreken: *Verhandeling Eigenschappen* (14 preken), *Brief Rechtvaardigmaking*, *Examen Tolerantie* (3 dl) |
| 6 | Gisbertus Voetius | **20-30%** | LAAG | Hoofdwerken in Latijn. Nederlandse vertalingen schaars |
| 7 | Johannes Calvijn | **40-50%** | MIDDEL | Institutie en basiscommentaren aanwezig. Oeuvre = 59 delen |
| 8 | Maarten Luther | **45-55%** | MIDDEL | Kerkpostillen en Galaten aanwezig. Oeuvre enorm |
| 9 | John Bunyan | **15-25%** | MIDDEL | 58 titels totaal. Ontbreken: *Holy War*, *Grace Abounding*, *Mr. Badman* |
| 10 | Thomas Boston | **20-30%** | MIDDEL | 12 delen totaal. Ontbreken: *Crook in the Lot*, *Body of Divinity* |
| 11 | C.H. Spurgeon | **5-10%** | LAAG | 3.561 preken totaal — volledig digitaliseren is onhaalbaar |
| 12 | K.A. Dachsel | **85-95%** | COMPLEET | Bijbelverklaring nagenoeg volledig |
| 13 | Isaac da Costa | **40-50%** | MIDDEL | Ontbreken: *Bezwaren tegen de Geest der Eeuw*, gedichten |
| 14 | Theodorus Beza | **30-40%** | LAAG | Primair Latijn |
| 15 | Ambrosius | **15-25%** | LAAG | Nederlandse vertalingen schaars |
| 16 | Augustinus | **15-25%** | LAAG | Enorm oeuvre |
| 17 | Apostolische Vaders | **40-50%** | MIDDEL | Klein corpus, overzichtelijk |

### 2.2 Top 5 Prioriteitsacties (ontbrekende werken)

1. **Hellenbroek — De Evangelische Jesaia** (6 delen, 212 redevoeringen)
   - Zijn absolute hoofdwerk ontbreekt volledig
   - Bron: Stichting Gereformeerd Erfgoed (standaardeditie in 16 delen)
   - Website: gereformeerderfgoed.nl

2. **Smijtegelt — Keurstoffen + Een Woord op Zijn Tijd + HC-verklaring**
   - 50 + 87 + 52 = 189 preken die ontbreken
   - Alles beschikbaar als PDF op theologienet.nl

3. **Van der Groe — Toetssteen van Ware en Valse Genade**
   - Zijn bekendste en invloedrijkste werk
   - Beschikbaar op theologienet.nl (3 delen PDF)

4. **Comrie — Verhandeling Eigenschappen + Brief Rechtvaardigmaking + Examen Tolerantie**
   - Alle werken beschikbaar op theologienet.nl

5. **Brakel — De Ware Christen + Trappen des Geestelijken Levens**
   - Aanvullende werken naast de RGD
   - Beschikbaar op theologienet.nl (PDF)

### 2.3 Beste digitale bronnen (gerankt)

| # | Bron | Dekking | Formaten | Kosten |
|---|------|---------|----------|--------|
| 1 | **theologienet.nl** | Beste enkele bron voor alle oudvaders | PDF/EPUB/DOCX | Gratis |
| 2 | **DBNL (dbnl.org)** | Calvijn Institutie, Da Costa, Voetius | PDF/XML | Gratis |
| 3 | **archive.org** | Latijnse originelen, Engelse puriteinse werken | Diverse | Gratis |
| 4 | **gereformeerderfgoed.nl** | Hellenbroek complete werken (16 dl) | Boek/digitaal | Commercieel |
| 5 | **StudyLight.org** | Dachsel bijbelcommentaar | Online | Gratis |
| 6 | **spurgeongems.org** | Alle 3.561 Spurgeon-preken | Online | Gratis |
| 7 | **maartenluther-nl.com** | Luther in het Nederlands | Online | Gratis |
| 8 | **hertog.nl / debanier.nl** | Hertaalde edities diverse auteurs | Boek | Commercieel |
| 9 | **Reveil-serie** | Hertaalde losse preken diverse oudvaders | Boek | Commercieel |
| 10 | **monergism.com** | Engelse puriteinse werken (Bunyan, Boston) | Online | Gratis |

### 2.4 Ontbrekende auteurs om te overwegen

Prominente oudvaders die **niet** in het project zitten:
- **Willem Teellinck** (1579-1629) — "vader van de Nadere Reformatie"
- **Jodocus van Lodenstein** (1620-1677) — dichter en prediker
- **Petrus van Mastricht** (1630-1706) — *Theoretico-Practica Theologia*
- **Herman Witsius** (1636-1708) — *De Verbonden*
- **Jacobus Koelman** (1631-1695)
- **Guiljelmus Saldenus** (1627-1694)

**NB:** Matthew Henry (1662-1714) staat wél in de database (3.796 commentaren) maar heeft geen lokale JSON-bestanden.

---

## STAP 3 — CONSOLIDATIEPLAN

### 3.1 Samenvoegen van fragmenten

**Principe:** Per auteur alle _extra, _extra2, _remaining, _new bestanden samenvoegen tot één bestand per type (commentaar / preek).

| Auteur | Samen te voegen | Doelbestand |
|--------|----------------|-------------|
| Brakel | brakel + _extra + _extra2 + _remaining | brakel_commentaries.json |
| Brakel | sermons_brakel + sermons_extra_brakel_extra | brakel_sermons.json |
| Boston | boston + _extra + _remaining | boston_commentaries.json |
| Comrie | comrie + _extra + _extra2 | comrie_commentaries.json |
| Hellenbroek | hellenbroek + _extra + _extra2 | hellenbroek_commentaries.json |
| Hellenbroek | sermons_hellenbroek + sermons_extra_hellenbroek_extra | hellenbroek_sermons.json |
| Kohlbrugge | kohlbrugge + _extra + _new* + _remaining | kohlbrugge_commentaries.json |
| Kohlbrugge | sermons_kohlbrugge + sermons_extra_kohlbrugge_extra | kohlbrugge_sermons.json |
| Smijtegelt | smijtegelt + _new | smijtegelt_commentaries.json |
| Smijtegelt | sermons_smijtegelt + sermons_extra_smijtegelt_extra | smijtegelt_sermons.json |
| Van der Groe | vandergroe + _extra + _new | vandergroe_commentaries.json |
| Calvijn | calvijn_extra + _extra2 + _new + _nl_parsed + _psalmen + _remaining | calvijn_commentaries_nl.json |
| Calvijn | calvijn.json (Engels) | calvijn_commentaries_en.json |
| Calvijn | calvijn_preken + sermons_calvijn + sermons_extra_calvijn_extra | calvijn_sermons.json |
| Bunyan | bunyan + _extra + _extra2 + _remaining | bunyan_commentaries.json |
| Spurgeon | spurgeon_nl + _new + _extra3 | spurgeon_commentaries_nl.json |
| Spurgeon | spurgeon.json (Engels) | spurgeon_commentaries_en.json |
| Luther | luther_full + _extra2 + _remaining | luther_commentaries.json |
| Da Costa | dacosta + _extra + _remaining + _bijbellezingen | dacosta_commentaries.json |
| Dachsel | dachsel_extra + _studylight | dachsel_commentaries.json |

*kohlbrugge_new.json: eerst stub-entries fixen of verwijderen

### 3.2 Deduplicatie-strategie

1. **Hash-based:** SHA256 van `book + chapter + verse + first_200_chars_text` → detecteer exacte duplicaten
2. **Fuzzy matching:** Voor near-duplicates (verschillende OCR-runs) → Levenshtein-afstand op tekst, threshold 0.9
3. **Specifieke cases:**
   - luther_full.json ↔ luther_galaten_online.json → vergelijk en behoud de betere versie
   - calvijn_nl_parsed.json ↔ calvijn_extra.json → vergelijk en merge
   - dachsel_studylight.json → interne dedup op `book+chapter+verse`

### 3.3 Voorgestelde mappenstructuur

```
data/
├── authors/
│   ├── brakel/
│   │   ├── commentaries.json
│   │   ├── sermons.json
│   │   └── sources/          # originele docx/pdf
│   ├── smijtegelt/
│   │   ├── commentaries.json
│   │   ├── sermons.json
│   │   └── sources/
│   ├── hellenbroek/
│   ├── vandergroe/
│   ├── comrie/
│   ├── voetius/
│   ├── calvijn/
│   │   ├── commentaries_nl.json
│   │   ├── commentaries_en.json
│   │   ├── sermons.json
│   │   └── sources/
│   ├── luther/
│   ├── bunyan/
│   ├── boston/
│   ├── spurgeon/
│   │   ├── commentaries_nl.json
│   │   ├── commentaries_en.json
│   │   ├── sermons.json
│   │   └── sources/
│   ├── dacosta/
│   ├── dachsel/
│   ├── beza/
│   ├── ambrosius/         # → hernoemen naar isaac_ambrose
│   ├── augustinus/
│   └── apostolisch/
├── bible/
│   ├── books.json
│   ├── verses.json
│   ├── verse_lookup.json
│   └── cross_references.json
├── confessions/
│   ├── heidelbergse_catechismus.json
│   ├── nederlandse_geloofsbelijdenis.json
│   └── dordtse_leerregels.json
└── kanttekeningen/
    └── statenvertaling.json
```

### 3.4 Naamconventies

- **Directories:** lowercase, geen spaties, slug-formaat (`vandergroe`, niet `van_der_groe`)
- **Bestanden:** `{type}.json` waar type = `commentaries`, `sermons`, `catechism`
- **Taalvariant:** `_nl` of `_en` suffix alleen bij meertalige auteurs (Calvijn, Spurgeon)
- **Bronbestanden:** originele docx/pdf in `sources/` subdirectory

---

## STAP 4 — FORMAT & ZOEKPLAN

### 4.1 Metadata-verrijking

**Ontbrekende velden die aangevuld moeten worden:**

| Veld | Huidig | Gewenst | Actie |
|------|--------|---------|-------|
| `title` | Ontbreekt in Patroon A | Verplicht voor alle entries | Genereer uit tekst (eerste zin/thema) |
| `source_collection` | Ontbreekt in Patroon A | Verplicht | Afleiden uit bronbestand |
| `author_id` | Niet in JSON | Verplicht | Toevoegen (FK naar authors tabel) |
| `source_work_id` | Niet in JSON | Verplicht | Toevoegen (FK naar source_works tabel) |
| `verse_end` | Bijna altijd null | Waar mogelijk vullen | Herparsen uit brontekst |
| `language` | Ontbreekt | Verplicht | `nl` of `en` |
| `year_written` | Ontbreekt | Optioneel | Waar bekend toevoegen |
| `word_count` | Ontbreekt | Automatisch | Berekenen bij import |
| `tags` | Ontbreekt | Gewenst | Theologische thema's (genade, verbond, bekering, etc.) |
| `bible_references` | Ontbreekt | Gewenst | Extra bijbelverwijzingen in de tekst detecteren |

### 4.2 Tekstopschoning

**OCR-artefacten:**
- calvijn_preken.json heeft ernstige OCR-problemen → opnieuw OCR'en vanuit bronbestanden of handmatig corrigeren
- Regex-patronen voor veelvoorkomende OCR-fouten: `ij` → `ĳ`, losse letters met spaties, verkeerde leestekens
- Oud-Nederlands spelling harmoniseren waar nodig (maar originele spelling respecteren)

**Opmaak:**
- HTML-tags strippen waar aanwezig
- Witruimte normaliseren (dubbele spaties, tabs, lege regels)
- Paragraafstructuur behouden met `\n\n`
- Voetnoten/kanttekeningen markeren met een consistente conventie

**Leesbaarheid:**
- Lange aaneengeschreven teksten splitsen in logische paragrafen
- Bijbelverwijzingen in de tekst markeren als links
- Archaïsche woorden optioneel van een verklaring voorzien (glossarium)

### 4.3 Zoekindex

**Opties (van simpel naar complex):**

1. **Supabase Full-Text Search (PostgreSQL tsvector)**
   - Pro: Al beschikbaar, geen extra infra
   - Con: Beperkte NL-woordstamming, geen fuzzy matching
   - Config: `to_tsvector('dutch', commentary_text)` + GIN-index

2. **Typesense / Meilisearch (self-hosted)**
   - Pro: Fuzzy search, facetten, snel, NL-support
   - Con: Extra service draaien
   - Aanbeveling: Meilisearch is lichter en eenvoudiger

3. **Supabase + pgvector (semantic search)**
   - Pro: Begrijpt betekenis, niet alleen woorden
   - Con: Embeddings genereren kost geld/tijd
   - Gebruik: Gemini embeddings (al geconfigureerd in OpenClaw)

**Aanbeveling:** Start met optie 1 (PostgreSQL FTS) als basis, voeg later optie 3 (semantic search) toe voor "vind preken over [thema]" queries.

**Zoekdimensies:**
- **Op bijbeltekst:** Zoek commentaar/preken bij een specifiek vers
- **Op auteur:** Filter op één of meerdere auteurs
- **Op thema/tag:** Zoek op theologische thema's
- **Full-text:** Vrij zoeken in alle teksten
- **Op belijdenis:** Koppeling HC/NGB/DL artikelen aan bijbelteksten

### 4.4 UI-verbeteringen

**Preekweergave:**
- **Leesweergave:** Volledige tekst met typografische aandacht (serif font, regelafstand 1.6, max 65 tekens breed)
- **Navigatie:** Inhoudsopgave per preek (automatisch uit kopjes)
- **Bijbelverwijzingen:** Klikbare links die de bijbeltekst tonen (SV/HSV toggle)
- **Auteur-context:** Korte bio + portret bij elke preek
- **Bladwijzers:** Favoriete preken/passages opslaan (bookmarks tabel bestaat al)

**Zoekresultaten:**
- Snippet met gemarkeerde zoektermen
- Facetten: auteur, bijbelboek, type (commentaar/preek), tijdperiode
- Sorteren op relevantie, auteur, bijbelvolgorde

**Bijbelverkenner:**
- Per vers: alle beschikbare commentaren naast elkaar (Calvijn, Dachsel, SV kanttekeningen, etc.)
- Kruisverwijzingen als klikbare links
- Belijdenisverwijzingen waar van toepassing

**Collectie-overzicht:**
- Per auteur: overzichtspagina met alle beschikbare werken
- Compleetheids-indicator (% van bekend oeuvre)
- Download-optie per collectie (EPUB/PDF)

---

## BIJLAGE A — Totaaloverzicht (matrix)

| Auteur | Lokaal (comm.) | Lokaal (preken) | DB (comm.) | DB (preken) | Compleetheid |
|--------|---------------|-----------------|-----------|-------------|-------------|
| Brakel | 1.849 | 841 | 700 | 690 | 65-70% |
| Smijtegelt | 352 | 1.661 | 284 | 207 | 45-55% |
| Hellenbroek | 591 | 266 | 223 | 17 | 30-40% |
| Van der Groe | 214 | 283 | 142 | 201 | 50-60% |
| Comrie | 242 | 137 | 116 | 113 | 50-60% |
| Voetius | 41 | 11 | 31 | 8 | 20-30% |
| Calvijn | 14.688 | 144 | 12.598 | 131 | 40-50% |
| Luther | 260 | 26 | 170 | 21 | 45-55% |
| Bunyan | 414 | 302 | 231 | 218 | 15-25% |
| Boston | 547 | 105 | 204 | 78 | 20-30% |
| Spurgeon | 2.676 | 286 | 2.304 | 31 | 5-10% |
| Da Costa | 705 | 0 | 20 | 0 | 40-50% |
| Dachsel | 52.732 | 0 | 21.909 | 0 | 85-95% |
| Beza | 6 | 0 | 0 | 0 | 30-40% |
| Ambrosius* | 0 | 241 | 0 | 194 | 15-25% |
| Augustinus | 0 | 51 | 0 | 1 | 15-25% |
| Apostolisch | 0 | 61 | 0 | 0 | 40-50% |
| **TOTAAL** | **75.317** | **4.415** | **38.932** | **1.910** | — |

*Ambrosius = eigenlijk Isaac Ambrose (Puritein)

## BIJLAGE B — Actieplan (prioriteit)

### Fase 1: Opschonen (direct)
- [ ] Verwijder lege bestanden (luther_new.json, sermons_extra_athanasius.json)
- [ ] Fix verkeerde attributie Ambrosius → Isaac Ambrose
- [ ] Fix verkeerde attributie sermons_extra_spurgeon_extra → Isaac Ambrose
- [ ] Dedupliceer luther_full ↔ luther_galaten_online
- [ ] Dedupliceer calvijn_nl_parsed ↔ calvijn_extra
- [ ] Dedupliceer intra-file in dachsel_studylight
- [ ] Markeer/verwijder stub-entries in kohlbrugge_new en sermons_bunyan

### Fase 2: Consolidatie (week 1-2)
- [ ] Voer samenvoegscript uit per auteur (zie §3.1)
- [ ] Verplaats naar data/authors/{slug}/ structuur
- [ ] Voeg metadata toe (author_id, source_work_id, language)
- [ ] Sync alles naar Supabase (sync_all.py updaten)

### Fase 3: Verrijking (week 2-4)
- [ ] Genereer titels voor entries zonder titel
- [ ] Bereken word_count
- [ ] Detecteer bijbelverwijzingen in tekst
- [ ] OCR-opschoning calvijn_preken
- [ ] Gescheiden EN/NL collecties voor Calvijn en Spurgeon

### Fase 4: Aanvullen (lopend)
- [ ] Download ontbrekende werken van theologienet.nl
- [ ] Parse naar JSON-formaat
- [ ] Laad in database
- [ ] Begin met Hellenbroek (hoogste prioriteit)

---

*Rapport gegenereerd door Dex ⚙️ — SchriftInzicht Digitaliseringsproject*
