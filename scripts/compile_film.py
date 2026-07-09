#!/usr/bin/env python3
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

def get_local_para_from_global_i(global_i):
    g = int(global_i)
    if g < 20:
        return g + 1  # Part 1: 0-19 -> 1-20
    elif g < 32:
        return g - 20 + 1  # Part 2: 20-31 -> 1-12
    else:
        return g - 32 + 1  # Part 3: 32+ -> 1+

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
            'index': i,
            'global_i': global_i,
            'sentence_idx': sentence_idx,
            'video_path': video_path
        })
    return panels

def get_media_duration(ffmpeg_path, filepath):
    cmd = [ffmpeg_path, '-i', filepath]
    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    stdout, stderr = process.communicate()
    output = stderr.decode('utf-8', errors='ignore')
    match = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.\d+)', output)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2))
        seconds = float(match.group(3))
        return hours * 3600 + minutes * 60 + seconds
    raise ValueError(f"Could not parse duration for {filepath}")

def resolve_image_path(video_path):
    base = os.path.basename(video_path)
    base_no_ext = os.path.splitext(base)[0]
    filename = f"{base_no_ext}.jpg"
    
    for part in [1, 2, 3]:
        p = f"img/comic/dil_{part}/{filename}"
        if os.path.exists(p):
            return p
            
    direct = video_path.replace('video/', 'img/comic/').replace('.mp4', '.jpg')
    if os.path.exists(direct):
        return direct
        
    return None

def generate_segment(ffmpeg_path, source_video, source_img, duration, width, height, output_path):
    vf_chain = f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}"
    
    if source_video and os.path.exists(source_video):
        cmd = [
            ffmpeg_path, '-y',
            '-stream_loop', '-1',
            '-i', source_video,
            '-t', f"{duration:.3f}",
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-r', '24',
            '-g', '48',
            '-crf', '23',
            '-preset', 'superfast',
            '-vf', vf_chain,
            '-an',
            output_path
        ]
    elif source_img and os.path.exists(source_img):
        cmd = [
            ffmpeg_path, '-y',
            '-loop', '1',
            '-i', source_img,
            '-t', f"{duration:.3f}",
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-r', '24',
            '-g', '48',
            '-crf', '23',
            '-preset', 'superfast',
            '-vf', vf_chain,
            '-an',
            output_path
        ]
    else:
        # Solid black fallback
        cmd = [
            ffmpeg_path, '-y',
            '-f', 'lavfi',
            '-i', f"color=c=black:s={width}x{height}:r=24",
            '-t', f"{duration:.3f}",
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-r', '24',
            '-g', '48',
            '-crf', '23',
            '-preset', 'superfast',
            '-an',
            output_path
        ]
        
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    return process.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="Compile film video with aligned cues and audio.")
    parser.add_argument('--part', type=int, default=1, choices=[1, 2, 3], help="Part number (Díl)")
    parser.add_argument('--mobile', action='store_true', help="Compile mobile vertical version (720x1280)")
    parser.add_argument('--ffmpeg', type=str, default='./bin/ffmpeg', help="Path to ffmpeg binary")
    args = parser.parse_args()

    part = args.part
    width = 720 if args.mobile else 1440
    height = 1280 if args.mobile else 1440
    suffix = "_mobile" if args.mobile else ""
    output_filename = f"video/dil_{part}_full_movie{suffix}.mp4"
    audio_path = f"audio/dil_{part}.mp3"
    
    print(f"🎬 Compiling Film for Part {part} ({width}x{height})")
    
    if not os.path.exists(args.ffmpeg):
        print(f"Error: ffmpeg binary not found at {args.ffmpeg}")
        sys.exit(1)
        
    if not os.path.exists(audio_path):
        print(f"Error: Audio file {audio_path} not found.")
        sys.exit(1)
        
    audio_dur = get_media_duration(args.ffmpeg, audio_path)
    print(f"🎶 Audio duration: {audio_dur:.2f} seconds")
    
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
        
    part_html = extract_part_html(html, part)
    panels = extract_panels_from_html(part_html, part)
    print(f"Found {len(panels)} panels in HTML")
    
    timings = PART_PANEL_TIMES.get(part, [])
    if len(timings) != len(panels):
        print(f"⚠️ Warning: Timing list length ({len(timings)}) does not match panel count ({len(panels)}).")
        # Align lengths
        min_len = min(len(timings), len(panels))
        timings = timings[:min_len]
        panels = panels[:min_len]
        
    # Build list of segments
    # Segment 0: Intro
    segments = []
    intro_dur = timings[0]
    intro_video = f"video/dil_{part}/{part:02d}_intro.mp4"
    if args.mobile:
        intro_mobile = intro_video.replace('.mp4', '_mobile.mp4')
        if os.path.exists(intro_mobile):
            intro_video = intro_mobile
            
    segments.append({
        'name': 'intro',
        'source_video': intro_video,
        'source_img': None,
        'duration': intro_dur
    })
    
    for i in range(len(panels)):
        start = timings[i]
        end = timings[i+1] if i + 1 < len(panels) else audio_dur
        duration = end - start
        
        panel = panels[i]
        src_video = panel['video_path']
        if args.mobile:
            src_mobile = src_video.replace('.mp4', '_mobile.mp4')
            if os.path.exists(src_mobile):
                src_video = src_mobile
                
        if i + 1 == len(panels) and src_video and os.path.exists(src_video):
            try:
                actual_dur = get_media_duration(args.ffmpeg, src_video)
                if actual_dur > duration:
                    duration = actual_dur
            except Exception:
                pass
                
        src_img = resolve_image_path(panel['video_path'])
        
        segments.append({
            'name': f"panel_{i:03d}",
            'source_video': src_video,
            'source_img': src_img,
            'duration': duration
        })
        
    # Create temp compile dir
    temp_dir = f"scratch/temp_compile_part_{part}{suffix}"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    concat_list_path = os.path.join(temp_dir, "concat_list.txt")
    with open(concat_list_path, 'w', encoding='utf-8') as concat_f:
        for idx, seg in enumerate(segments):
            if seg['duration'] <= 0.001:
                continue
                
            seg_filename = f"seg_{idx:03d}.mp4"
            seg_path = os.path.join(temp_dir, seg_filename)
            
            print(f"[{idx+1}/{len(segments)}] {seg['name']} -> {seg_filename} ({seg['duration']:.2f}s)")
            success = generate_segment(
                args.ffmpeg,
                seg['source_video'],
                seg['source_img'],
                seg['duration'],
                width,
                height,
                seg_path
            )
            if not success:
                print(f"Error compiling segment {seg['name']}")
                sys.exit(1)
                
            concat_f.write(f"file '{seg_filename}'\n")
            
    # Concatenate segments
    print("🔄 Concatenating video segments...")
    raw_video_path = os.path.join(temp_dir, "raw_concatenated.mp4")
    cmd_concat = [
        args.ffmpeg, '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_list_path,
        '-c', 'copy',
        raw_video_path
    ]
    process = subprocess.Popen(cmd_concat, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print("Error during video concatenation:")
        print(stderr.decode('utf-8', errors='ignore'))
        sys.exit(1)
        
    # --- BGM (Background Music) ---
    # Track order matches app.js BGM_TRACKS
    GLOBAL_BGM_TRACKS = ["music/Honeycomb Shutdown_1.mp3", "music/Shutdown Grid 1.mp3"]
    PART2_BGM_TRACKS = [
        "music/Brass Lens Exodus 2.mp3",
        "music/The Hive Collapse 22.mp3",
        "music/The Hive Collapse 2.mp3"
    ]
    PART3_BGM_TRACKS = [
        "music/Gold Hive Dawn 3.mp3"
    ]
    BGM_TRACKS = {
        1: GLOBAL_BGM_TRACKS,
        2: PART2_BGM_TRACKS,
        3: PART3_BGM_TRACKS
    }
    bgm_tracks = [t for t in BGM_TRACKS.get(part, []) if os.path.exists(t)]
    
    if bgm_tracks:
        # Concatenate BGM tracks (A+B+A+B... loop to cover full audio duration)
        bgm_concat_path = os.path.join(temp_dir, "bgm_concat.mp3")
        bgm_list_path = os.path.join(temp_dir, "bgm_list.txt")
        
        # Calculate how many loops we need
        total_bgm_dur = 0
        for t in bgm_tracks:
            total_bgm_dur += get_media_duration(args.ffmpeg, t)
        loops_needed = max(1, int(audio_dur / total_bgm_dur) + 1)
        
        with open(bgm_list_path, 'w') as bf:
            for _ in range(loops_needed):
                for t in bgm_tracks:
                    abs_path = os.path.abspath(t)
                    bf.write(f"file '{abs_path}'\n")
        
        print(f"🎵 Concatenating BGM tracks ({len(bgm_tracks)} tracks × {loops_needed} loops)...")
        cmd_bgm = [
            args.ffmpeg, '-y',
            '-f', 'concat', '-safe', '0',
            '-i', bgm_list_path,
            '-t', f"{audio_dur:.3f}",
            '-c:a', 'libmp3lame', '-b:a', '192k',
            bgm_concat_path
        ]
        process = subprocess.Popen(cmd_bgm, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        if process.returncode != 0:
            print("Warning: BGM concat failed, proceeding without music")
            print(stderr.decode('utf-8', errors='ignore'))
            bgm_concat_path = None
        else:
            print(f"✅ BGM prepared ({audio_dur:.1f}s)")
    else:
        bgm_concat_path = None
        print("⚠️ No BGM tracks found, compiling without background music")
    
    # Mix narration + BGM into combined audio
    if bgm_concat_path and os.path.exists(bgm_concat_path):
        print("🎵 Mixing narration (100%) + BGM (30%)...")
        mixed_audio_path = os.path.join(temp_dir, "mixed_audio.aac")
        cmd_mix = [
            args.ffmpeg, '-y',
            '-i', audio_path,
            '-i', bgm_concat_path,
            '-filter_complex',
            '[0:a]volume=1.0[narr];[1:a]volume=0.30[bgm];[narr][bgm]amix=inputs=2:duration=first:dropout_transition=3[out]',
            '-map', '[out]',
            '-c:a', 'aac', '-b:a', '192k',
            mixed_audio_path
        ]
        process = subprocess.Popen(cmd_mix, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        if process.returncode != 0:
            print("Warning: Audio mixing failed, using narration only")
            print(stderr.decode('utf-8', errors='ignore'))
            final_audio = audio_path
        else:
            final_audio = mixed_audio_path
            print("✅ Audio mixed successfully")
    else:
        final_audio = audio_path
    
    # Merge video + mixed audio
    print("🎬 Merging video and mixed audio track...")
    cmd_merge = [
        args.ffmpeg, '-y',
        '-i', raw_video_path,
        '-i', final_audio,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        output_filename
    ]
    process = subprocess.Popen(cmd_merge, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print("Error merging audio and video:")
        print(stderr.decode('utf-8', errors='ignore'))
        sys.exit(1)
        
    print(f"✅ Compilation finished! Video saved to: {output_filename}")
    
    # Cleanup temp dir
    print("🧹 Cleaning up temporary files...")
    shutil.rmtree(temp_dir)
    print("All done!")

if __name__ == "__main__":
    main()
