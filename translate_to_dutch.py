"""
SchriftInzicht -- Batch vertaling Engels -> Nederlands
=====================================================
Vertaalt calvijn.json en spurgeon.json via Claude API (OpenClaw proxy).

Gebruik:
  python translate_to_dutch.py calvijn.json
  python translate_to_dutch.py spurgeon.json
  python translate_to_dutch.py calvijn.json --start 500   # resume vanaf item 500
  python translate_to_dutch.py calvijn.json --dry-run      # test zonder API calls
  python translate_to_dutch.py calvijn.json --workers 3    # parallel requests

Werking:
  - Vertaalt 1 item per API call (betrouwbaar, geen JSON parsing issues)
  - Bewaart origineel Engels als text_en, vertaling als text
  - Slaat voortgang op na elke batch van SAVE_EVERY items
  - Bij klaar: overschrijft origineel (met backup)
  - Gebruikt Claude via OpenClaw proxy (poort 3456, OpenAI-compatible)
  - Ondersteunt concurrent requests voor snelheid
"""

import json
import sys
import os
import time
import argparse
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# OpenClaw proxy (OpenAI-compatible endpoint)
API_URL = "http://localhost:3456/v1/chat/completions"

SAVE_EVERY = 10  # Save progress after every N items
SLEEP_BETWEEN = 0.5  # seconds between items (per worker)
DEFAULT_WORKERS = 2  # concurrent translation workers

SYSTEM_PROMPT = """Je bent een vertaalmachine. Je vertaalt Engelse theologische teksten naar Nederlands.
Regels:
- Geef UITSLUITEND de vertaling, NOOIT uitleg, inleiding, of commentaar
- Behoud theologische termen (genade, rechtvaardiging, verbond, etc.)
- Behoud stijl en toon van het origineel
- Volledige vertaling, geen samenvatting
- Begin direct met de vertaalde tekst"""


def translate_one(text: str, retries: int = 3) -> str:
    """Vertaal een enkele tekst via Claude API."""
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8000,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Vertaal deze Engelse theologische tekst naar Nederlands:\n\n{text}"},
        ],
    }

    for attempt in range(retries):
        try:
            resp = requests.post(
                API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=300,
            )
            resp.raise_for_status()
            data = resp.json()

            choices = data.get("choices", [])
            if choices:
                translation = choices[0]["message"]["content"].strip()
                if len(translation) > 20:  # sanity check
                    return translation

            print(f"  [WARN] Empty response, retrying...")

        except Exception as e:
            print(f"  [WARN] Attempt {attempt+1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(5 * (attempt + 1))

    print(f"  [FAIL] Translation failed after {retries} retries, keeping original")
    return text


def translate_item(args_tuple):
    """Worker function for concurrent translation."""
    idx, item = args_tuple
    text = item.get("text", "")
    if not text or len(text) < 10:
        return idx, text  # skip very short/empty items

    translation = translate_one(text)
    time.sleep(SLEEP_BETWEEN)
    return idx, translation


def main():
    parser = argparse.ArgumentParser(description="Vertaal JSON bestanden EN->NL")
    parser.add_argument("input_file", help="Input JSON bestand")
    parser.add_argument("--start", type=int, default=0, help="Start vanaf item N")
    parser.add_argument("--end", type=int, default=0, help="Stop na item N (0=alles)")
    parser.add_argument("--dry-run", action="store_true", help="Test zonder API calls")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help="Concurrent workers")
    args = parser.parse_args()

    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"[ERROR] Bestand niet gevonden: {input_path}")
        sys.exit(1)

    progress_path = input_path.with_name(f"{input_path.stem}_nl_progress.json")
    backup_path = input_path.with_name(f"{input_path.stem}_en_backup.json")

    # Load input
    with open(input_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    total = len(items)
    print(f"[INFO] {input_path.name}: {total} items")
    print(f"[INFO] Totaal tekens: {sum(len(d.get('text','')) for d in items):,}")

    # Load progress if exists
    if progress_path.exists() and args.start == 0:
        with open(progress_path, "r", encoding="utf-8") as f:
            progress = json.load(f)
        start = progress.get("last_completed", 0)
        items = progress.get("items", items[:start]) + items[start:]
        print(f"[RESUME] Voortgang gevonden: {start}/{total} klaar, hervat vanaf {start}")
    else:
        start = args.start

    end = args.end if args.end > 0 else total

    if args.dry_run:
        count = end - start
        print(f"[DRY RUN] zou {count} items vertalen met {args.workers} workers")
        est_minutes = (count * 50) / args.workers / 60
        print(f"[DRY RUN] geschatte tijd: ~{est_minutes:.0f} minuten ({est_minutes/60:.1f} uur)")
        return

    # Backup original if not already done
    if not backup_path.exists():
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"[BACKUP] {backup_path.name}")

    print(f"[START] Items {start+1}-{end} met {args.workers} workers")
    t_start = time.time()
    completed = 0
    failed = 0

    # Process items with thread pool
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        batch_start = start
        while batch_start < end:
            batch_end = min(batch_start + SAVE_EVERY, end)
            batch_items = [(i, items[i]) for i in range(batch_start, batch_end)]

            futures = {executor.submit(translate_item, item): item[0] for item in batch_items}

            for future in as_completed(futures):
                idx, translation = future.result()
                item = items[idx]
                original = item.get("text", "")

                # Store original as text_en if not already done
                if "text_en" not in item:
                    item["text_en"] = original

                if translation != original:
                    item["text"] = translation
                    completed += 1
                else:
                    failed += 1

            # Save progress
            with open(progress_path, "w", encoding="utf-8") as f:
                json.dump({
                    "last_completed": batch_end,
                    "total": total,
                    "items": items,
                }, f, ensure_ascii=False)

            elapsed = time.time() - t_start
            rate = (batch_end - start) / elapsed if elapsed > 0 else 0
            remaining = (end - batch_end) / rate / 60 if rate > 0 else 0
            pct = (batch_end / total) * 100
            print(f"[PROGRESS] {batch_end}/{total} ({pct:.1f}%) | {rate:.1f} items/s | ~{remaining:.0f} min remaining | ok={completed} fail={failed}")

            batch_start = batch_end

    # Save final result
    with open(input_path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    # Cleanup progress file
    if progress_path.exists():
        os.remove(str(progress_path))

    elapsed = time.time() - t_start
    print(f"\n[DONE] Klaar! {completed} items vertaald, {failed} gefaald in {elapsed/60:.1f} minuten")
    print(f"[FILE] Resultaat: {input_path.name}")
    print(f"[FILE] Backup: {backup_path.name}")


if __name__ == "__main__":
    main()
