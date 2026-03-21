#!/bin/bash
BASE="https://reformata.nl/Theologie/Verklaringen/Henry,%20M.%20-%20Letterlijke%20en%20practicale%20verklaring%20van%20het%20Oude%20en%20Nieuwe%20Testament"
DEST="C:/Users/midir/schriftinzicht/pdf_import/henry"

URLS=(
"01.%20Genesis%20[Henry].pdf"
"02.%20Exodus%20[Henry].pdf"
"03.%20Leviticus%20[Henry].pdf"
"04.%20Numeri%20[Henry].pdf"
"05.%20Deuteronomium%20[Henry].pdf"
"06.%20Jozua%20[Henry].pdf"
"07.%20Richteren%20[Henry].pdf"
"08.%20Ruth%20[Henry].pdf"
"09.%201%20Samuel%20[Henry].pdf"
"10.%202%20Samuel%20[Henry].pdf"
"11.%201%20Koningen%20[Henry].pdf"
"12.%202%20Koningen%20[Henry].pdf"
"13.%201%20Kronieken%20[Henry].pdf"
"14.%202%20Kronieken%20[Henry].pdf"
"15.%20Ezra%20[Henry].pdf"
"16.%20Nehemia%20[Henry].pdf"
"17.%20Esther%20[Henry].pdf"
"18.%20Job%20[Henry].pdf"
"19.%20Psalmen%20[Henry].pdf"
"20.%20Spreuken%20[Henry].pdf"
"21.%20Prediker%20[Henry].pdf"
"22.%20Hooglied%20[Henry].pdf"
"23.%20Jesaja%20[Henry].pdf"
"24.%20Jeremia%20[Henry].pdf"
"25.%20Klaagliederen%20[Henry].pdf"
"26.%20Ezechiel%20[Henry].pdf"
"27.%20Daniel%20[Henry].pdf"
"28.%20Hosea%20[Henry].pdf"
"29.%20Joel%20[Henry].pdf"
"30.%20Amos%20[Henry].pdf"
"31.%20Obadja%20[Henry].pdf"
"32.%20Jona%20[Henry].pdf"
"33.%20Micha%20[Henry].pdf"
"34.%20Nahum%20[Henry].pdf"
"35.%20Habakuk%20[Henry].pdf"
"36.%20Zefanja%20[Henry].pdf"
"37.%20Haggai%20[Henry].pdf"
"38.%20Zacharia%20[Henry].pdf"
"39.%20Maleachi%20[Henry].pdf"
"40.%20Matthe%C3%BCs%20[Henry].pdf"
"41.%20Markus%20[Henry].pdf"
"42.%20Lukas%20[Henry].pdf"
"43.%20Johannes%20[Henry].pdf"
"44.%20Handelingen%20[Henry].pdf"
"45.%20Romeinen%20[Henry].pdf"
"46.%201%20Corinthi%C3%ABrs%20[Henry].pdf"
"47.%202%20Corinthi%C3%ABrs%20[Henry].pdf"
"48.%20Galaten%20[Henry].pdf"
"49.%20Efezi%C3%ABrs%20[Henry].pdf"
"50.%20Filippenzen%20[Henry].pdf"
"51.%20Colossenzen%20[Henry].pdf"
"52.%201%20Thessalonicenzen%20[Henry].pdf"
"53.%202%20Thessalonicenzen%20[Henry].pdf"
"54.%201%20Timothe%C3%BCs%20[Henry].pdf"
"55.%202%20Timothe%C3%BCs%20[Henry].pdf"
"56.%20Titus%20[Henry].pdf"
"57.%20Filemon%20[Henry].pdf"
"58.%20Hebree%C3%ABn%20[Henry].pdf"
"59.%20Jakobus%20[Henry].pdf"
"60.%201%20Petrus%20[Henry].pdf"
"61.%202%20Petrus%20[Henry].pdf"
"62.%201%20Johannes%20[Henry].pdf"
"63.%202%20Johannes%20[Henry].pdf"
"64.%203%20Johannes%20[Henry].pdf"
"65.%20Judas%20[Henry].pdf"
"66.%20Openbaring%20[Henry].pdf"
)

SUCCESS=0
FAIL=0

for filename in "${URLS[@]}"; do
  # Decode %XX sequences for local filename
  localname=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$filename'))" 2>/dev/null || echo "$filename")
  url="$BASE/$filename"
  outfile="$DEST/$localname"

  echo -n "Downloading: $localname ... "
  http_code=$(curl -s -o "$outfile" -w "%{http_code}" -L \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" \
    -H "Referer: https://reformata.nl/" \
    "$url")

  if [ "$http_code" = "200" ]; then
    size=$(wc -c < "$outfile" 2>/dev/null || echo "?")
    echo "OK ($http_code, ${size} bytes)"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "FAILED (HTTP $http_code)"
    rm -f "$outfile"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== DONE: $SUCCESS OK, $FAIL FAILED ==="
