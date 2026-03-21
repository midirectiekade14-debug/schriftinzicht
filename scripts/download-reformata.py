#!/usr/bin/env python3
"""Download verklaringen van reformata.nl via scan.php API"""

import json
import os
import sys
import urllib.parse
import urllib.request

BASE = "https://reformata.nl"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

def get_file_tree():
    """Haal de volledige bestandsboom op van scan.php"""
    req = urllib.request.Request(f"{BASE}/scan.php", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def find_folder(node, target, path=""):
    """Zoek een map recursief in de bestandsboom"""
    if isinstance(node, dict):
        name = node.get("name", "")
        current = f"{path}/{name}" if path else name
        if current == target and node.get("type") == "folder":
            return node
        if "items" in node:
            for item in node["items"]:
                r = find_folder(item, target, current)
                if r:
                    return r
    elif isinstance(node, list):
        for item in node:
            r = find_folder(item, target, path)
            if r:
                return r
    return None

def download_folder(folder_path, dest_dir):
    """Download alle bestanden uit een map"""
    print(f"Ophalen bestandsboom van {BASE}/scan.php ...")
    tree = get_file_tree()

    folder = find_folder(tree, folder_path)
    if not folder:
        print(f"Map '{folder_path}' niet gevonden!")
        return

    files = [f for f in folder.get("items", []) if f.get("type") == "file"]
    print(f"Gevonden: {len(files)} bestanden in {folder_path}")

    os.makedirs(dest_dir, exist_ok=True)

    downloaded = 0
    skipped = 0
    errors = 0

    for f in files:
        name = f["name"]
        filepath = f["path"]  # e.g. /Theologie/Verklaringen/Calvijn/01. Genesis [Calvijn].pdf
        dest_file = os.path.join(dest_dir, name)
        expected_size = f.get("size", 0)

        if os.path.exists(dest_file):
            existing_size = os.path.getsize(dest_file)
            if existing_size > 10000:  # >10KB = waarschijnlijk echt
                print(f"  SKIP: {name} ({existing_size:,} bytes)")
                skipped += 1
                continue

        # URL-encode het pad, maar bewaar /
        encoded_path = urllib.parse.quote(filepath, safe="/")
        url = f"{BASE}{encoded_path}"

        print(f"  [{downloaded+1}/{len(files)}] {name} ({expected_size:,} bytes) ...", end=" ", flush=True)

        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as resp, open(dest_file, "wb") as out:
                out.write(resp.read())
            actual_size = os.path.getsize(dest_file)

            if actual_size < 10000 and expected_size > 10000:
                print(f"FOUT (verwacht {expected_size:,}, kreeg {actual_size:,})")
                os.remove(dest_file)
                errors += 1
            else:
                print(f"OK ({actual_size:,} bytes)")
                downloaded += 1
        except Exception as e:
            print(f"FOUT: {e}")
            if os.path.exists(dest_file):
                os.remove(dest_file)
            errors += 1

    print(f"\nKlaar! {downloaded} gedownload, {skipped} overgeslagen, {errors} fouten")

    # Totale grootte
    total = sum(os.path.getsize(os.path.join(dest_dir, f)) for f in os.listdir(dest_dir))
    print(f"Totaal: {total / 1024 / 1024:.1f} MB in {dest_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Gebruik: python download-reformata.py <map-pad> <doel-dir>")
        print("Voorbeeld: python download-reformata.py 'Theologie/Verklaringen/Calvijn' ./data/calvijn-verklaringen")
        sys.exit(1)

    download_folder(sys.argv[1], sys.argv[2])
