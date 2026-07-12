#!/usr/bin/env python3
"""
compile_film_extended.py — Extended Film Compilation

Unlike the standard compile_film.py (which loops videos to match narration timing),
this version:
- If narration is LONGER than video: loop the video to fill narration duration
- If video is LONGER than narration: play the FULL video, insert silence in audio,
  then continue with next scene + resume narration

Result: every video clip plays in full, narration pauses when needed.
BGM music (30%) is mixed in throughout.
"""
import os
import re
import sys
import json
import argparse
import subprocess
import shutil

# Timings from app.js (PART_PANEL_TIMES)
PART_PANEL_TIMES = {
    1: [6.40, 20.63, 28.90, 30.74, 41.40, 50.14, 55.46, 62.10, 64.14, 74.24, 78.06, 86.79, 88.24, 91.14, 95.80, 101.58, 107.70, 109.80, 119.62, 122.14, 124.80, 132.08, 136.66, 141.66, 149.86, 154.26, 162.60, 164.26, 175.94, 179.92, 191.84, 200.16, 203.02, 207.58, 210.82, 219.96, 229.32, 231.50, 236.30, 247.52, 249.54, 255.90, 264.76, 266.96, 278.84, 283.98, 294.54, 299.24, 302.80, 311.04, 316.60, 324.46, 327.56, 337.62, 348.36, 354.06, 356.78, 360.16, 368.34, 376.46],
    2: [10.18, 17.94, 27.62, 31.02, 39.68, 43.34, 50.14, 52.24, 59.50, 64.60, 67.82, 72.52, 73.76, 83.30, 89.50, 92.96, 106.70, 110.42, 114.12, 120.14, 123.83, 127.52, 131.21, 134.90, 136.50, 145.18, 150.66, 152.78, 158.18, 163.68, 166.14, 172.76, 180.98, 185.42, 187.62, 194.32, 204.32, 206.92, 213.70, 225.12, 228.78, 236.04, 239.42, 246.28, 250.50, 257.00, 263.42, 267.26, 272.42, 275.56, 278.48, 288.06, 293.74, 301.34, 308.34, 313.42, 319.52, 323.36, 326.32, 330.72, 334.26, 342.90, 342.90],
    3: [10.46, 16.68, 21.68, 30.62, 38.98, 47.38, 54.10, 57.78, 62.72, 66.96, 68.68, 85.92, 89.92, 92.40, 95.20, 103.70, 112.88, 119.30, 121.12, 125.92, 131.46, 135.24, 145.94, 149.40, 157.30, 167.54, 175.98, 182.38, 188.04, 196.44, 201.26, 203.60, 209.08, 217.38, 220.76, 226.70, 228.88, 241.92, 247.98, 253.60, 259.54, 261.14, 265.28, 269.22, 273.50, 284.44, 290.16, 298.68, 302.38, 306.10, 311.66, 318.42, 325.86, 332.46, 336.16, 342.54, 346.62, 349.72, 358.16, 366.92, 374.04, 376.61, 379.18, 389.12, 393.66, 396.90, 402.42, 406.50, 410.54]
}

PART1_BGM_TRACKS = [
    "music/Neon Rain_1a.mp3",
    "music/Neon Rain_1b.mp3",
    "music/Brass Lens Exodus 1c.mp3"
]
PART2_BGM_TRACKS = [
    "music/The Monolith in Rain 2a.mp3",
    "music/The Monolith in Rain 2b.mp3",
    "music/Brass Lens Exodus 2c.mp3"
]
PART3_BGM_TRACKS = [
    "music/The Hive Mind 3a.mp3",
    "music/The Hive Mind 3b.mp3",
    "music/Gold Hive Dawn 3c.mp3"
]
BGM_TRACKS = {
    1: PART1_BGM_TRACKS,
    2: PART2_BGM_TRACKS,
    3: PART3_BGM_TRACKS
}

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
        data_sentence_match = re.search(r'data-sentence="(\d+)"', attrs)
        data_video_match = re.search(r'data-video="([^"]+)"', attrs)
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

def get_media_duration(ffmpeg_path, filepath):
    cmd = [ffmpeg_path, '-i', filepath]
    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    stdout, stderr = process.communicate()
    output = stderr.decode('utf-8', errors='ignore')
    match = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.\d+)', output)
    if match:
        return int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))
    return None

def resolve_image_path(video_path):
    base_no_ext = os.path.splitext(os.path.basename(video_path))[0]
    for p in [1, 2, 3]:
        path = f"img/comic/dil_{p}/{base_no_ext}.jpg"
        if os.path.exists(path):
            return path
    direct = video_path.replace('video/', 'img/comic/').replace('.mp4', '.jpg')
    return direct if os.path.exists(direct) else None

def run_cmd(cmd):
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    return process.returncode == 0, stderr.decode('utf-8', errors='ignore')

def generate_segment(ffmpeg_path, source_video, source_img, duration, width, height, output_path, loop=True):
    """Generate a video segment. If loop=False, use full video without looping."""
    vf_chain = f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}"
    
    if source_video and os.path.exists(source_video):
        cmd = [ffmpeg_path, '-y']
        if loop:
            cmd += ['-stream_loop', '-1']
        cmd += [
            '-i', source_video,
            '-t', f"{duration:.3f}",
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-r', '24', '-g', '48', '-crf', '23', '-preset', 'superfast',
            '-vf', vf_chain, '-an', output_path
        ]
    elif source_img and os.path.exists(source_img):
        cmd = [
            ffmpeg_path, '-y', '-loop', '1', '-i', source_img,
            '-t', f"{duration:.3f}",
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-r', '24', '-g', '48', '-crf', '23', '-preset', 'superfast',
            '-vf', vf_chain, '-an', output_path
        ]
    else:
        cmd = [
            ffmpeg_path, '-y', '-f', 'lavfi',
            '-i', f"color=c=black:s={width}x{height}:r=24",
            '-t', f"{duration:.3f}",
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-r', '24', '-g', '48', '-crf', '23', '-preset', 'superfast',
            '-an', output_path
        ]
    ok, err = run_cmd(cmd)
    return ok

def main():
    parser = argparse.ArgumentParser(description="Extended Film Compilation — full video clips, narration pauses when needed.")
    parser.add_argument('--part', type=int, default=1, choices=[1, 2, 3])
    parser.add_argument('--mobile', action='store_true', help="Compile mobile vertical version (720x1280)")
    parser.add_argument('--ffmpeg', type=str, default='./bin/ffmpeg')
    args = parser.parse_args()

    part = args.part
    width = 720 if args.mobile else 1280
    height = 1280 if args.mobile else 720
    suffix = "_mobile" if args.mobile else ""
    output_filename = f"video/dil_{part}_extended_movie{suffix}.mp4"
    audio_path = f"audio/dil_{part}.mp3"
    
    print(f"🎬 Extended Film Compilation — Part {part} ({width}x{height})")
    
    if not os.path.exists(args.ffmpeg):
        print(f"Error: ffmpeg not found at {args.ffmpeg}"); sys.exit(1)
    if not os.path.exists(audio_path):
        print(f"Error: Audio {audio_path} not found"); sys.exit(1)
        
    audio_dur = get_media_duration(args.ffmpeg, audio_path)
    print(f"🎶 Audio duration: {audio_dur:.2f}s")
    
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    part_html = extract_part_html(html, part)
    panels = extract_panels_from_html(part_html, part)
    timings = PART_PANEL_TIMES.get(part, [])
    
    min_len = min(len(timings), len(panels))
    timings = timings[:min_len]
    panels = panels[:min_len]
    print(f"Found {len(panels)} panels")
    
    # --- BUILD EXTENDED TIMELINE ---
    # For each segment: compare narration duration vs actual video duration
    # Use max(narration_dur, video_dur) as segment duration
    # Track silence gaps to insert in audio
    
    segments = []
    audio_timeline = []  # list of (narr_start, narr_end, segment_duration) tuples
    
    # Intro segment
    intro_dur = timings[0]
    intro_video = f"video/dil_{part}/{part:02d}_intro.mp4"
    intro_actual_dur = get_media_duration(args.ffmpeg, intro_video) if os.path.exists(intro_video) else None
    
    if intro_actual_dur and intro_actual_dur > intro_dur:
        seg_dur = intro_actual_dur
        print(f"  INTRO: narr={intro_dur:.2f}s, video={intro_actual_dur:.2f}s → use video (silence gap: {intro_actual_dur - intro_dur:.2f}s)")
    else:
        seg_dur = intro_dur
        
    segments.append({
        'name': 'intro',
        'source_video': intro_video,
        'source_img': None,
        'narr_duration': intro_dur,
        'seg_duration': seg_dur,
        'loop': not (intro_actual_dur and intro_actual_dur > intro_dur)
    })
    audio_timeline.append((0, intro_dur, seg_dur))
    
    for i in range(len(panels)):
        narr_start = timings[i]
        narr_end = timings[i+1] if i + 1 < len(panels) else audio_dur
        narr_dur = narr_end - narr_start
        
        panel = panels[i]
        src_video = panel['video_path']
        if args.mobile:
            src_mobile = src_video.replace('.mp4', '_mobile.mp4')
            if os.path.exists(src_mobile):
                src_video = src_mobile
        src_img = resolve_image_path(panel['video_path'])
        
        # Get actual video duration
        video_actual = None
        if os.path.exists(src_video):
            video_actual = get_media_duration(args.ffmpeg, src_video)
        
        if video_actual and video_actual > narr_dur:
            seg_dur = video_actual
            loop = False
            extra = video_actual - narr_dur
            if extra > 0.5:  # Only log significant extensions
                print(f"  [{i+1}/{len(panels)}] video={video_actual:.2f}s > narr={narr_dur:.2f}s → full video (+{extra:.1f}s silence)")
        else:
            seg_dur = narr_dur
            loop = True
            
        segments.append({
            'name': f'panel_{i:03d}',
            'source_video': src_video,
            'source_img': src_img,
            'narr_duration': narr_dur,
            'seg_duration': seg_dur,
            'loop': loop
        })
        audio_timeline.append((narr_start, narr_end, seg_dur))
    
    total_extended = sum(s['seg_duration'] for s in segments)
    total_extra = total_extended - audio_dur
    print(f"\n📊 Original: {audio_dur:.1f}s → Extended: {total_extended:.1f}s (+{total_extra:.1f}s from full videos)")
    
    # --- TEMP DIR ---
    temp_dir = f"scratch/temp_extended_part_{part}{suffix}"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    # --- GENERATE VIDEO SEGMENTS ---
    concat_list_path = os.path.join(temp_dir, "concat_list.txt")
    with open(concat_list_path, 'w') as cf:
        for idx, seg in enumerate(segments):
            if seg['seg_duration'] <= 0.001:
                continue
            seg_file = f"seg_{idx:03d}.mp4"
            seg_path = os.path.join(temp_dir, seg_file)
            
            label = "🔁" if seg['loop'] else "▶️"
            print(f"  {label} [{idx+1}/{len(segments)}] {seg['name']} ({seg['seg_duration']:.2f}s)")
            
            ok = generate_segment(
                args.ffmpeg, seg['source_video'], seg['source_img'],
                seg['seg_duration'], width, height, seg_path, loop=seg['loop']
            )
            if not ok:
                print(f"Error compiling {seg['name']}"); sys.exit(1)
            cf.write(f"file '{seg_file}'\n")
    
    # --- CONCAT VIDEO ---
    print("🔄 Concatenating video segments...")
    raw_video = os.path.join(temp_dir, "raw.mp4")
    ok, err = run_cmd([
        args.ffmpeg, '-y', '-f', 'concat', '-safe', '0',
        '-i', concat_list_path, '-c', 'copy', raw_video
    ])
    if not ok:
        print("Concat error:", err); sys.exit(1)
    
    # --- BUILD EXTENDED AUDIO (narration with silence gaps) ---
    print("🔇 Building extended audio with silence gaps...")
    # Strategy: extract each narration chunk, pad with silence if video was longer, concat
    audio_parts_list = os.path.join(temp_dir, "audio_parts.txt")
    with open(audio_parts_list, 'w') as af:
        for idx, (narr_start, narr_end, seg_dur) in enumerate(audio_timeline):
            narr_dur = narr_end - narr_start
            
            # Extract narration chunk
            narr_chunk = os.path.join(temp_dir, f"narr_{idx:03d}.wav")
            ok, _ = run_cmd([
                args.ffmpeg, '-y',
                '-i', audio_path,
                '-ss', f"{narr_start:.3f}",
                '-t', f"{narr_dur:.3f}",
                '-ar', '44100', '-ac', '2',
                narr_chunk
            ])
            if not ok:
                # Generate silence as fallback
                ok, _ = run_cmd([
                    args.ffmpeg, '-y', '-f', 'lavfi',
                    '-i', f'anullsrc=r=44100:cl=stereo',
                    '-t', f"{seg_dur:.3f}",
                    '-ar', '44100', '-ac', '2',
                    narr_chunk
                ])
            
            # If segment is longer than narration, append silence
            silence_dur = seg_dur - narr_dur
            if silence_dur > 0.01:
                silence_chunk = os.path.join(temp_dir, f"silence_{idx:03d}.wav")
                ok, _ = run_cmd([
                    args.ffmpeg, '-y', '-f', 'lavfi',
                    '-i', f'anullsrc=r=44100:cl=stereo',
                    '-t', f"{silence_dur:.3f}",
                    '-ar', '44100', '-ac', '2',
                    silence_chunk
                ])
                # Concat narration + silence into one padded chunk
                padded_chunk = os.path.join(temp_dir, f"padded_{idx:03d}.wav")
                pad_list = os.path.join(temp_dir, f"pad_{idx:03d}.txt")
                with open(pad_list, 'w') as pf:
                    pf.write(f"file 'narr_{idx:03d}.wav'\n")
                    pf.write(f"file 'silence_{idx:03d}.wav'\n")
                ok, _ = run_cmd([
                    args.ffmpeg, '-y', '-f', 'concat', '-safe', '0',
                    '-i', pad_list, '-c', 'copy', padded_chunk
                ])
                af.write(f"file 'padded_{idx:03d}.wav'\n")
            else:
                af.write(f"file 'narr_{idx:03d}.wav'\n")
    
    # Concat all audio parts
    extended_narr = os.path.join(temp_dir, "extended_narration.wav")
    ok, err = run_cmd([
        args.ffmpeg, '-y', '-f', 'concat', '-safe', '0',
        '-i', audio_parts_list, '-c', 'copy', extended_narr
    ])
    if not ok:
        print("Audio concat error:", err); sys.exit(1)
    print("✅ Extended narration built")
    
    # --- BGM ---
    bgm_tracks = [t for t in BGM_TRACKS.get(part, []) if os.path.exists(t)]
    final_audio = extended_narr
    
    if bgm_tracks:
        bgm_concat = os.path.join(temp_dir, "bgm.mp3")
        bgm_list = os.path.join(temp_dir, "bgm_list.txt")
        total_bgm_dur = sum(get_media_duration(args.ffmpeg, t) or 0 for t in bgm_tracks)
        loops = max(1, int(total_extended / max(total_bgm_dur, 1)) + 1)
        
        with open(bgm_list, 'w') as bf:
            for _ in range(loops):
                for t in bgm_tracks:
                    bf.write(f"file '{os.path.abspath(t)}'\n")
        
        print(f"🎵 Preparing BGM ({len(bgm_tracks)} tracks × {loops} loops)...")
        ok, _ = run_cmd([
            args.ffmpeg, '-y', '-f', 'concat', '-safe', '0',
            '-i', bgm_list, '-t', f"{total_extended:.3f}",
            '-c:a', 'libmp3lame', '-b:a', '192k', bgm_concat
        ])
        
        if ok:
            print("🎵 Mixing narration (100%) + BGM (30%)...")
            mixed = os.path.join(temp_dir, "mixed.aac")
            ok, _ = run_cmd([
                args.ffmpeg, '-y',
                '-i', extended_narr, '-i', bgm_concat,
                '-filter_complex',
                '[0:a]volume=1.0[narr];[1:a]volume=0.30[bgm];[narr][bgm]amix=inputs=2:duration=longest:dropout_transition=3[out]',
                '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', mixed
            ])
            if ok:
                final_audio = mixed
                print("✅ Audio mixed with BGM")
            else:
                print("⚠️ BGM mix failed, using narration only")
        else:
            print("⚠️ BGM concat failed, using narration only")
    
    # --- FINAL MERGE ---
    print("🎬 Merging extended video + audio...")
    ok, err = run_cmd([
        args.ffmpeg, '-y',
        '-i', raw_video, '-i', final_audio,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        output_filename
    ])
    if not ok:
        print("Merge error:", err); sys.exit(1)
    
    final_dur = get_media_duration(args.ffmpeg, output_filename)
    print(f"\n✅ Extended film saved: {output_filename}")
    print(f"📊 Duration: {final_dur:.1f}s (original narration: {audio_dur:.1f}s, +{final_dur - audio_dur:.1f}s)")
    
    print("🧹 Cleaning up...")
    shutil.rmtree(temp_dir)
    print("All done!")

if __name__ == "__main__":
    main()
