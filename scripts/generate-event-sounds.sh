#!/usr/bin/env bash
# Regenerates short MP3 tones in android/app/src/main/res/raw/
set -euo pipefail
RAW="$(cd "$(dirname "$0")/.." && pwd)/android/app/src/main/res/raw"
mkdir -p "$RAW"

gen() {
  local freq="$1" dur="$2" vol="$3" name="$4"
  ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=${dur}" \
    -af "volume=${vol}" "$RAW/${name}.mp3" -loglevel error
}

gen 740 0.13 0.4 evt_four
gen 980 0.2 0.55 evt_six
gen 180 0.22 0.65 evt_wicket
gen 200 0.18 0.5 evt_runout
gen 520 0.07 0.28 evt_wide
gen 460 0.11 0.32 evt_noball
gen 800 0.1 0.35 evt_freehit
gen 620 0.16 0.38 evt_milestone

echo "Wrote event sounds to $RAW"
echo "Toss result uses toss_coin_land.mp3 (bundled separately, not generated here)."
