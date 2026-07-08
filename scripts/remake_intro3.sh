#!/bin/bash
# Regenerate intro 3 with exact duration and crisp cuts
set -e

FFMPEG="./bin/ffmpeg"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

PART=3
PART_PAD="03"
DURATION=10.46
IMG_DIR="img/comic/dil_3"
OUTPUT="video/dil_3/03_intro.mp4"
TEMP_DIR="scratch/tmp_intro3"

rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Collect images
IMGS=()
while IFS= read -r f; do
    IMGS+=("$f")
done < <(find "$IMG_DIR" -maxdepth 1 -name "${PART_PAD}_*.jpg" \
    ! -name "*.bak" ! -name "*desktop_tmp*" | sort)

NUM_IMGS=${#IMGS[@]}
echo "🎬 Díl 3 intro — $NUM_IMGS images → ${DURATION}s"

# Per-image duration (in seconds)
PER_IMG=$(echo "$DURATION $NUM_IMGS" | awk '{printf "%.4f", $1/$2}')
# Frame count per image at 24fps
FRAMES_PER=$(echo "$PER_IMG" | awk '{v=int($1*24); if(v<1) v=1; print v}')
echo "   Per image: ${PER_IMG}s (~${FRAMES_PER} frames)"

# Build concat file with each image as a still segment
# Use a single ffmpeg call with concat demuxer
CONCAT="$TEMP_DIR/concat.txt"
> "$CONCAT"

for i in "${!IMGS[@]}"; do
    IMG="${IMGS[$i]}"
    SEG="$TEMP_DIR/seg_$(printf '%03d' $i).mp4"
    
    # Simple scale+crop to 1080x1080, hold for exact duration
    "$FFMPEG" -y -hide_banner -loglevel error \
        -loop 1 -i "$IMG" \
        -t "$PER_IMG" \
        -vf "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080" \
        -c:v libx264 -pix_fmt yuv420p -r 24 -crf 18 -preset fast \
        -an "$SEG"
    
    echo "file '$(basename $SEG)'" >> "$CONCAT"
    printf "\r   [%d/%d]" $((i+1)) $NUM_IMGS
done
echo ""

# Concatenate
echo "   🔗 Concatenating..."
"$FFMPEG" -y -hide_banner -loglevel error \
    -f concat -safe 0 -i "$CONCAT" \
    -c copy \
    -an "$TEMP_DIR/raw.mp4"

# Trim to exact target duration
echo "   ✂️  Trimming to exactly ${DURATION}s..."
"$FFMPEG" -y -hide_banner -loglevel error \
    -i "$TEMP_DIR/raw.mp4" \
    -t "$DURATION" \
    -c:v libx264 -pix_fmt yuv420p -r 24 -crf 18 -preset medium \
    -an "$OUTPUT"

FINAL_DUR=$("$FFMPEG" -i "$OUTPUT" 2>&1 | grep Duration | awk '{print $2}' | tr -d ',')
echo "   ✅ Done! $OUTPUT ($FINAL_DUR)"

rm -rf "$TEMP_DIR"
