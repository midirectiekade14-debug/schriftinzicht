#!/bin/bash
DEST="C:/Users/midir/schriftinzicht/pdf_import/calvijn"
BASE="https://reformata.nl/Theologie/Verklaringen/Calvijn"

urls=(
  "01.%20Genesis%20%5BCalvijn%5D.pdf"
  "02.%20Exodus,%20Leviticus,%20Numeri%20%26%20Deuteronomium%20%5BCalvijn%5D.pdf"
  "03.%20Jozua%20%5BCalvijn%5D.pdf"
  "04.%20Psalmen%20%5BCalvijn%5D.pdf"
  "05.%20Jesaja%20%5BCalvijn%5D.pdf"
  "06.%20Jeremia%20%5BCalvijn%5D.pdf"
  "07.%20Klaagliederen%20%5BCalvijn%5D.pdf"
  "08.%20Ezechiel%20%5BCalvijn%5D.pdf"
  "09.%20Daniel%20%5BCalvijn%5D.pdf"
  "10.%20Hosea%20%5BCalvijn%5D.pdf"
  "11.%20Joel%20%5BCalvijn%5D.pdf"
  "12.%20Amos%20%5BCalvijn%5D.pdf"
  "13.%20Obadja%20%5BCalvijn%5D.pdf"
  "14.%20Jona%20%5BCalvijn%5D.pdf"
  "15.%20Micha%20%5BCalvijn%5D.pdf"
  "16.%20Nahum%20%5BCalvijn%5D.pdf"
  "17.%20Habakuk%20%5BCalvijn%5D.pdf"
  "18.%20Zefanja%20%5BCalvijn%5D.pdf"
  "19.%20Haggai%20%5BCalvijn%5D.pdf"
  "20.%20Zacharia%20%5BCalvijn%5D.pdf"
  "21.%20Maleachi%20%5BCalvijn%5D.pdf"
  "22.%20Evangeli%C3%ABn%20%5BCalvijn%5D.pdf"
  "23.%20Johannes%20%5BCalvijn%5D.pdf"
  "24.%20Handelingen%20%5BCalvijn%5D.pdf"
  "25.%20Romeinen%20%5BCalvijn%5D.pdf"
  "26.%201%20Korinthe%20%5BCalvijn%5D.pdf"
  "27.%202%20Korinthe%20%5BCalvijn%5D.pdf"
  "28.%20Galaten%20%5BCalvijn%5D.pdf"
  "29.%20Efeze%20%5BCalvijn%5D.pdf"
  "30.%20Filippenzen%20%5BCalvijn%5D.pdf"
  "31.%20Kolossenzen%20%5BCalvijn%5D.pdf"
  "32.%201%20Thessalonicenzen%20%5BCalvijn%5D.pdf"
  "33.%202%20Thessalonicenzen%20%5BCalvijn%5D.pdf"
  "34.%201%20Timothe%C3%BCs%20%5BCalvijn%5D.pdf"
  "35.%202%20Timothe%C3%BCs%20%5BCalvijn%5D.pdf"
  "36.%20Titus%20%5BCalvijn%5D.pdf"
  "37.%20Filemon%20%5BCalvijn%5D.pdf"
  "38.%20Hebree%C3%ABn%20%5BCalvijn%5D.pdf"
  "39.%20Jakobus%20%5BCalvijn%5D.pdf"
  "40.%201%20Petrus%20%5BCalvijn%5D.pdf"
  "41.%202%20Petrus%20%5BCalvijn%5D.pdf"
  "42.%201%20Johannes%20%5BCalvijn%5D.pdf"
  "43.%20Judas%20%5BCalvijn%5D.pdf"
  "44.%20Pastorale%20brieven%20%5BCalvijn%5D.pdf"
)

count=0
for enc_file in "${urls[@]}"; do
  # Decode filename for local save
  local_name=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$enc_file'))")
  url="$BASE/$enc_file"
  dest_path="$DEST/$local_name"

  echo "[$((count+1))/44] Downloading: $local_name"
  curl -L -s -o "$dest_path" "$url"
  status=$?
  if [ $status -eq 0 ]; then
    size=$(du -h "$dest_path" 2>/dev/null | cut -f1)
    echo "  OK ($size)"
    count=$((count+1))
  else
    echo "  FAILED (curl exit $status)"
  fi
done

echo ""
echo "=== DONE: $count/44 files downloaded ==="
echo "Total size:"
du -sh "$DEST"/*.pdf 2>/dev/null | tail -1
du -sh "$DEST" 2>/dev/null
