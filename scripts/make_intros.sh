#!/bin/bash
# ============================================================
# make_intros.sh — Generate new intro videos for all 3 díly
# from comic JPG images with rapid slideshow + Ken Burns effect
#
# Each intro: 1080x1080, h264, 24fps, no audio
# Durations: Díl 1 = 6.40s, Díl 2 = 10.18s, Díl 3 = 10.46s
# (matching PART_PANEL_TIMES first-cue from compile_film.py)
# ============================================================

set -e

FFMPEG="./bin/ffmpeg"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Check ffmpeg
if [ ! -x "$FFMPEG" ]; then
    echo "❌ ffmpeg not found at $FFMPEG"
    exit 1
fi

TEMP_DIR="scratch/tmp_intros"
mkdir -p "$TEMP_DIR"

# Durations from PART_PANEL_TIMES[part][0]
# These are the timestamps of the first panel — intro fills that time
DURATIONS=(0 6.40 10.18 10.46)

for PART in 1 2 3; do
    PART_PAD=$(printf "%02d" $PART)
    IMG_DIR="img/comic/dil_${PART}"
    OUTPUT="video/dil_${PART}/${PART_PAD}_intro.mp4"
    BACKUP="video/dil_${PART}/${PART_PAD}_intro.mp4.bak"
    DURATION=${DURATIONS[$PART]}

    echo ""
    echo "🎬 ═══════════════════════════════════════════"
    echo "   Díl $PART — generating intro ($DURATION s)"
    echo "═══════════════════════════════════════════════"

    # Collect all JPGs for this part (sorted, skip backups and desktop_tmp)
    IMGS=()
    while IFS= read -r f; do
        IMGS+=("$f")
    done < <(find "$IMG_DIR" -maxdepth 1 -name "${PART_PAD}_*.jpg" \
        ! -name "*.bak" ! -name "*desktop_tmp*" | sort)

    NUM_IMGS=${#IMGS[@]}
    echo "   Found $NUM_IMGS comic images"

    if [ "$NUM_IMGS" -eq 0 ]; then
        echo "   ⚠️  No images found, skipping"
        continue
    fi

    # Calculate per-image duration
    # We want a rapid montage — each image shown briefly
    # Use awk for float division
    PER_IMG=$(echo "$DURATION $NUM_IMGS" | awk '{printf "%.4f", $1/$2}')
    echo "   Each image: ${PER_IMG}s"

    # Generate segments for each image with zoom/pan (Ken Burns)
    CONCAT_FILE="$TEMP_DIR/concat_dil_${PART}.txt"
    > "$CONCAT_FILE"

    for i in "${!IMGS[@]}"; do
        IMG="${IMGS[$i]}"
        SEG_FILE="$TEMP_DIR/seg_${PART}_$(printf '%03d' $i).mp4"

        # Alternate between zoom-in and zoom-out for variety
        # zoompan: z from 1.0→1.15 or 1.15→1.0, slight x/y drift
        VARIANT=$((i % 4))
        case $VARIANT in
            0) # Zoom in, drift right-down
                ZP="zoompan=z='min(zoom+0.003,1.15)':x='iw/2-(iw/zoom/2)+10*on/25':y='ih/2-(ih/zoom/2)+5*on/25':d=1:s=1080x1080:fps=24"
                ;;
            1) # Zoom out, drift left
                ZP="zoompan=z='if(eq(on,0),1.15,max(zoom-0.003,1.0))':x='iw/2-(iw/zoom/2)-8*on/25':y='ih/2-(ih/zoom/2)':d=1:s=1080x1080:fps=24"
                ;;
            2) # Zoom in, drift left-up
                ZP="zoompan=z='min(zoom+0.004,1.2)':x='iw/2-(iw/zoom/2)-12*on/25':y='ih/2-(ih/zoom/2)-6*on/25':d=1:s=1080x1080:fps=24"
                ;;
            3) # Slight zoom, drift down
                ZP="zoompan=z='min(zoom+0.002,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+8*on/25':d=1:s=1080x1080:fps=24"
                ;;
        esac

        # Calculate frame count for this segment
        FRAMES=$(echo "$PER_IMG" | awk '{printf "%d", $1 * 24}')
        if [ "$FRAMES" -lt 1 ]; then FRAMES=1; fi

        # Use zoompan with proper duration
        "$FFMPEG" -y -hide_banner -loglevel error \
            -loop 1 -i "$IMG" \
            -t "$PER_IMG" \
            -vf "scale=2160:2160:force_original_aspect_ratio=increase,crop=2160:2160,${ZP}" \
            -c:v libx264 -pix_fmt yuv420p -r 24 -crf 20 -preset fast \
            -an "$SEG_FILE"

        echo "file '$(basename $SEG_FILE)'" >> "$CONCAT_FILE"

        # Progress indicator
        DONE=$((i + 1))
        printf "\r   [%d/%d] segments..." "$DONE" "$NUM_IMGS"
    done
    echo ""

    # Backup old intro
    if [ -f "$OUTPUT" ]; then
        cp "$OUTPUT" "$BACKUP"
        echo "   📦 Backed up old intro to $(basename $BACKUP)"
    fi

    # Concatenate all segments into final intro
    echo "   🔗 Concatenating $NUM_IMGS segments..."
    "$FFMPEG" -y -hide_banner -loglevel error \
        -f concat -safe 0 -i "$CONCAT_FILE" \
        -c:v libx264 -pix_fmt yuv420p -r 24 -crf 18 -preset medium \
        -an "$OUTPUT"

    FINAL_DUR=$("$FFMPEG" -i "$OUTPUT" 2>&1 | grep Duration | awk '{print $2}' | tr -d ',')
    echo "   ✅ Done! $OUTPUT ($FINAL_DUR)"
done

# Cleanup
echo ""
echo "🧹 Cleaning up temp files..."
rm -rf "$TEMP_DIR"

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ All 3 intros generated successfully!"
echo "═══════════════════════════════════════════════"
