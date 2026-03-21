#!/bin/bash
# Download alle Calvijn verklaringen van reformata.nl
# Bron: https://reformata.nl/#Theologie%2FVerklaringen%2FCalvijn
# 44 PDF's, ~97 MB totaal

BASE="https://reformata.nl"
DEST="$(dirname "$0")/../data/calvijn-verklaringen"
mkdir -p "$DEST"

echo "Downloading Calvijn verklaringen van reformata.nl..."
echo "Doel: $DEST"
echo ""

# Haal bestandslijst op via scan.php
curl -sL "${BASE}/scan.php" | python3 -c "
import json, sys, urllib.parse
data = json.load(sys.stdin)

def find_folder(node, target, path=''):
    if isinstance(node, dict):
        name = node.get('name', '')
        current = path + '/' + name if path else name
        if current == target and node.get('type') == 'folder':
            return node
        if 'items' in node:
            for item in node['items']:
                r = find_folder(item, target, current)
                if r: return r
    elif isinstance(node, list):
        for item in node:
            r = find_folder(item, target, path)
            if r: return r
    return None

folder = find_folder(data, 'Theologie/Verklaringen/Calvijn')
if folder and 'items' in folder:
    for f in folder['items']:
        # path begint met / dus direct bruikbaar
        print(f['path'])
" | while read -r filepath; do
    filename=$(basename "$filepath")
    if [ -f "$DEST/$filename" ]; then
        echo "SKIP (exists): $filename"
        continue
    fi
    url="${BASE}$(python3 -c "import urllib.parse; print(urllib.parse.quote('$filepath', safe='/'))")"
    echo "Downloading: $filename"
    curl -sL -o "$DEST/$filename" "$url"
    if [ $? -eq 0 ] && [ -s "$DEST/$filename" ]; then
        size=$(du -h "$DEST/$filename" | cut -f1)
        echo "  OK ($size)"
    else
        echo "  FOUT bij downloaden!"
        rm -f "$DEST/$filename"
    fi
done

echo ""
echo "Klaar! Bestanden in: $DEST"
ls -lh "$DEST" | tail -5
echo "Totaal: $(du -sh "$DEST" | cut -f1)"
