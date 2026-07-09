#!/usr/bin/env python3
"""
generate_extended_srt.py — Generate SRT subtitles for Extended Film versions

Takes the original SRT (audio/dil_N.srt) and remaps timecodes to match
the extended movie timeline, where silence gaps are inserted whenever
a video clip is longer than its narration segment.

Usage:
    python3 scripts/generate_extended_srt.py --part 1
    python3 scripts/generate_extended_srt.py --part 1 --part 2 --part 3
    python3 scripts/generate_extended_srt.py --all
"""
import os
import re
import sys
import argparse
import subprocess

# ---------------------------------------------------------------------------
# Shared data from compile_film_extended.py
# ---------------------------------------------------------------------------
PART_PANEL_TIMES = {
    1: [6.40, 20.63, 28.90, 30.74, 41.40, 50.14, 55.46, 62.10, 64.14, 74.24, 78.06, 86.79, 88.24, 91.14, 95.80, 101.58, 107.70, 109.80, 119.62, 122.14, 124.80, 132.08, 136.66, 141.66, 149.86, 154.26, 162.60, 164.26, 175.94, 179.92, 191.84, 200.16, 203.02, 207.58, 210.82, 219.96, 229.32, 231.50, 236.30, 247.52, 249.54, 255.90, 264.76, 266.96, 278.84, 283.98, 294.54, 299.24, 302.80, 311.04, 316.60, 324.46, 327.56, 337.62, 348.36, 354.06, 356.78, 360.16, 368.34, 376.46],
    2: [10.18, 17.94, 27.62, 31.02, 39.68, 43.34, 50.14, 52.24, 59.50, 64.60, 67.82, 72.52, 73.76, 83.30, 89.50, 92.96, 106.70, 110.42, 114.12, 120.14, 123.83, 127.52, 131.21, 134.90, 136.50, 145.18, 150.66, 152.78, 158.18, 163.68, 166.14, 172.76, 180.98, 185.42, 187.62, 194.32, 204.32, 206.92, 213.70, 225.12, 228.78, 236.04, 239.42, 246.28, 250.50, 257.00, 263.42, 267.26, 272.42, 275.56, 278.48, 288.06, 293.74, 301.34, 308.34, 313.42, 319.52, 323.36, 326.32, 330.72, 334.26, 342.90, 342.90],
    3: [10.46, 16.68, 21.68, 30.62, 38.98, 47.38, 54.10, 57.78, 62.72, 66.96, 68.68, 85.92, 89.92, 92.40, 95.20, 103.70, 112.88, 119.30, 121.12, 125.92, 131.46, 135.24, 145.94, 149.40, 157.30, 167.54, 175.98, 182.38, 188.04, 196.44, 201.26, 203.60, 209.08, 217.38, 220.76, 226.70, 228.88, 241.92, 247.98, 253.60, 259.54, 261.14, 265.28, 269.22, 273.50, 284.44, 290.16, 298.68, 302.38, 306.10, 311.66, 318.42, 325.86, 332.46, 336.16, 342.54, 346.62, 349.72, 358.16, 366.92, 374.04, 376.61, 379.18, 389.12, 393.66, 396.90, 402.42, 406.50, 410.54]
}

# ---------------------------------------------------------------------------
# HTML panel extraction (same as compile_film_extended.py)
# ---------------------------------------------------------------------------
def get_local_para_from_global_i(global_i):
    g = int(global_i)
    if g < 20:
        return g + 1
    elif g < 32:
        return g - 20 + 1
    else:
        return g - 32 + 1

def extract_part_html(html, part):
    start_tag = f'id="comic-content-part{part}"'
    start_idx = html.find(start_tag)
    if start_idx == -1:
        raise ValueError(f"Could not find section for Part {part} in index.html")
    next_part = part + 1
    end_tag = f'id="comic-content-part{next_part}"'
    end_idx = html.find(end_tag, start_idx)
    if end_idx == -1:
        end_idx = html.find('<!-- End Comic Grid', start_idx)
    if end_idx == -1:
        end_idx = html.find('</main>', start_idx)
    return html[start_idx:end_idx]

def extract_panels_from_html(part_html, part):
    panel_pattern = re.compile(r'<div\s+[^>]*class="[^"]*(?<!-)comic-panel(?!-)[^"]*"([^>]*?)>', re.DOTALL)
    matches = panel_pattern.findall(part_html)
    panels = []
    for i, attrs in enumerate(matches):
        data_i_match = re.search(r'data-i="(\d+)"', attrs)
        data_video_match = re.search(r'data-video="([^"]+)"', attrs)
        data_sentence_match = re.search(r'data-sentence="(\d+)"', attrs)
        global_i = int(data_i_match.group(1)) if data_i_match else -1
        sentence_idx = int(data_sentence_match.group(1)) if data_sentence_match else -1
        video_attr = data_video_match.group(1) if data_video_match else None
        if video_attr:
            video_path = video_attr
        else:
            part_str = f"{part:02d}"
            para_str = f"{get_local_para_from_global_i(global_i):02d}"
            sub_str = f"{(sentence_idx + 1):02d}"
            video_path = f"video/dil_{part}/{part_str}_{para_str}_{sub_str}.mp4"
        panels.append({
            'index': i, 'global_i': global_i,
            'sentence_idx': sentence_idx, 'video_path': video_path
        })
    return panels

# ---------------------------------------------------------------------------
# ffmpeg duration probe
# ---------------------------------------------------------------------------
def get_media_duration(ffmpeg_path, filepath):
    cmd = [ffmpeg_path, '-i', filepath]
    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    _, stderr = process.communicate()
    output = stderr.decode('utf-8', errors='ignore')
    match = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.\d+)', output)
    if match:
        return int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))
    return None

# ---------------------------------------------------------------------------
# SRT parsing & formatting
# ---------------------------------------------------------------------------
SRT_TS_RE = re.compile(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})')

def srt_ts_to_seconds(ts_str):
    m = SRT_TS_RE.match(ts_str)
    if not m:
        return 0.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4)) / 1000.0

def seconds_to_srt_ts(s):
    if s < 0:
        s = 0.0
    h = int(s // 3600)
    s %= 3600
    m = int(s // 60)
    s %= 60
    sec = int(s)
    ms = int(round((s - sec) * 1000))
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"

def parse_srt(filepath):
    """Parse SRT file into list of cues: (index, start_s, end_s, text_lines)"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    cues = []
    # Split on double newlines (blank lines)
    blocks = re.split(r'\n\s*\n', content.strip())
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue
        # First line: cue index
        idx_line = lines[0].strip()
        if not idx_line.isdigit():
            continue
        # Second line: timestamps
        ts_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', lines[1])
        if not ts_match:
            continue
        start_s = srt_ts_to_seconds(ts_match.group(1))
        end_s = srt_ts_to_seconds(ts_match.group(2))
        text = '\n'.join(lines[2:])
        cues.append({
            'index': int(idx_line),
            'start': start_s,
            'end': end_s,
            'text': text
        })
    return cues

def write_srt(cues, filepath):
    with open(filepath, 'w', encoding='utf-8') as f:
        for i, cue in enumerate(cues, 1):
            f.write(f"{i}\n")
            f.write(f"{seconds_to_srt_ts(cue['start'])} --> {seconds_to_srt_ts(cue['end'])}\n")
            f.write(f"{cue['text']}\n\n")

# ---------------------------------------------------------------------------
# Build extended timeline (mirrors compile_film_extended.py logic)
# ---------------------------------------------------------------------------
def build_extended_timeline(part, ffmpeg_path):
    """
    Returns a list of segment dicts:
        { 'narr_start', 'narr_end', 'ext_start', 'ext_end', 'seg_duration' }
    where narr_* are positions in the original audio and ext_* are positions
    in the extended movie.
    """
    audio_path = f"audio/dil_{part}.mp3"
    audio_dur = get_media_duration(ffmpeg_path, audio_path)
    if audio_dur is None:
        print(f"Error: cannot probe {audio_path}")
        sys.exit(1)

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    part_html = extract_part_html(html, part)
    panels = extract_panels_from_html(part_html, part)
    timings = PART_PANEL_TIMES.get(part, [])

    min_len = min(len(timings), len(panels))
    timings = timings[:min_len]
    panels = panels[:min_len]

    segments = []
    ext_cursor = 0.0  # running position in extended movie

    # --- Intro segment ---
    intro_dur = timings[0]
    intro_video = f"video/dil_{part}/{part:02d}_intro.mp4"
    intro_actual = get_media_duration(ffmpeg_path, intro_video) if os.path.exists(intro_video) else None

    if intro_actual and intro_actual > intro_dur:
        seg_dur = intro_actual
    else:
        seg_dur = intro_dur

    segments.append({
        'narr_start': 0.0,
        'narr_end': intro_dur,
        'ext_start': ext_cursor,
        'ext_end': ext_cursor + seg_dur,
        'seg_duration': seg_dur,
        'extra': seg_dur - intro_dur
    })
    ext_cursor += seg_dur

    # --- Panel segments ---
    for i in range(len(panels)):
        narr_start = timings[i]
        narr_end = timings[i + 1] if i + 1 < len(panels) else audio_dur
        narr_dur = narr_end - narr_start

        src_video = panels[i]['video_path']
        video_actual = None
        if os.path.exists(src_video):
            video_actual = get_media_duration(ffmpeg_path, src_video)

        if video_actual and video_actual > narr_dur:
            seg_dur = video_actual
        else:
            seg_dur = narr_dur

        segments.append({
            'narr_start': narr_start,
            'narr_end': narr_end,
            'ext_start': ext_cursor,
            'ext_end': ext_cursor + seg_dur,
            'seg_duration': seg_dur,
            'extra': seg_dur - narr_dur
        })
        ext_cursor += seg_dur

    return segments, audio_dur, ext_cursor

# ---------------------------------------------------------------------------
# Remap a single original time to extended time
# ---------------------------------------------------------------------------
def remap_time(original_t, segments):
    """
    Map an original narration time to the extended movie time.

    Within each segment the narration plays from ext_start for narr_duration
    seconds, then silence fills to ext_end. So:
        extended_t = seg.ext_start + (original_t - seg.narr_start)

    If original_t falls in the silence gap (shouldn't happen for valid SRT
    cues, but clamp just in case).
    """
    for seg in segments:
        if original_t < seg['narr_end'] or seg is segments[-1]:
            # This cue belongs to this segment
            offset = original_t - seg['narr_start']
            extended_t = seg['ext_start'] + offset
            # Clamp to segment boundary
            extended_t = min(extended_t, seg['ext_end'])
            return max(0.0, extended_t)
    # Fallback: beyond last segment — just add total extra
    return original_t

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def process_part(part, ffmpeg_path):
    srt_input = f"audio/dil_{part}.srt"
    srt_output = f"video/dil_{part}_extended_movie.srt"

    if not os.path.exists(srt_input):
        print(f"⚠️  Díl {part}: SRT {srt_input} not found, skipping")
        return False

    print(f"\n{'='*60}")
    print(f"📝 Díl {part} — Generating extended SRT")
    print(f"{'='*60}")

    # Build timeline
    segments, audio_dur, ext_total = build_extended_timeline(part, ffmpeg_path)
    total_extra = ext_total - audio_dur

    # Stats
    extended_segs = [s for s in segments if s['extra'] > 0.5]
    print(f"   Original duration: {audio_dur:.1f}s")
    print(f"   Extended duration: {ext_total:.1f}s (+{total_extra:.1f}s)")
    print(f"   Segments with silence gaps: {len(extended_segs)}")
    for s in extended_segs:
        print(f"      [{s['narr_start']:.1f}s–{s['narr_end']:.1f}s] → +{s['extra']:.1f}s silence")

    # Parse & remap SRT
    cues = parse_srt(srt_input)
    print(f"   SRT cues: {len(cues)}")

    remapped = []
    for cue in cues:
        new_start = remap_time(cue['start'], segments)
        new_end = remap_time(cue['end'], segments)
        # Ensure minimum cue duration of 100ms
        if new_end - new_start < 0.1:
            new_end = new_start + (cue['end'] - cue['start'])
        remapped.append({
            'start': new_start,
            'end': new_end,
            'text': cue['text']
        })

    write_srt(remapped, srt_output)
    print(f"   ✅ Saved: {srt_output}")

    # Quick sanity check: last cue should end near extended total
    if remapped:
        last = remapped[-1]
        print(f"   Last cue ends at {seconds_to_srt_ts(last['end'])} (movie: {seconds_to_srt_ts(ext_total)})")

    return True

def main():
    parser = argparse.ArgumentParser(description="Generate SRT subtitles for extended movie versions")
    parser.add_argument('--part', type=int, action='append', choices=[1, 2, 3],
                        help="Part number(s) to process (can specify multiple)")
    parser.add_argument('--all', action='store_true', help="Process all 3 parts")
    parser.add_argument('--ffmpeg', type=str, default='./bin/ffmpeg')
    args = parser.parse_args()

    if args.all:
        parts = [1, 2, 3]
    elif args.part:
        parts = args.part
    else:
        parts = [1, 2, 3]  # default: all

    if not os.path.exists(args.ffmpeg):
        print(f"Error: ffmpeg not found at {args.ffmpeg}")
        sys.exit(1)

    ok_count = 0
    for p in parts:
        if process_part(p, args.ffmpeg):
            ok_count += 1

    print(f"\n🏁 Done — {ok_count}/{len(parts)} extended SRT files generated")

if __name__ == "__main__":
    main()
