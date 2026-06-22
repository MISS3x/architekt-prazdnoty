import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

def split_into_sentences(text):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def clean_html_tags(text):
    return re.sub(r'<[^>]+>', '', text).strip()

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    video_dir = os.path.join(base_dir, "video")
    out_dir = os.path.join(base_dir, "img", "screenshots")
    os.makedirs(out_dir, exist_ok=True)

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find all paragraph blocks of Part 1, Part 2 and Part 3
    pattern = r'<(p|blockquote|div) data-i="(\d+)"[^>]*>(.*?)</\1>'
    matches = re.findall(pattern, html, re.DOTALL)
    print(f"Found {len(matches)} paragraph items in index.html.")

    for tag, idx_str, content in matches:
        idx = int(idx_str)
        
        # Decide part and relative index
        if idx < 20:
            part = 1
            rel_idx = idx
        elif idx < 32:
            part = 2
            rel_idx = idx - 20
        else:
            part = 3
            rel_idx = idx - 32
            
        para_num = rel_idx + 1
        part_str = f"{part:02d}"
        para_str = f"{para_num:02d}"

        sentences = split_into_sentences(content)
        num_sentences = len(sentences)

        # Get existing video files for this paragraph
        para_video_dir = os.path.join(video_dir, f"dil_{part}")
        prefix = f"{part_str}_{para_str}_"
        videos = []
        if os.path.exists(para_video_dir):
            videos = [f for f in os.listdir(para_video_dir) if f.startswith(prefix) and f.endswith(".mp4")]
            videos.sort()

        print(f"Part {part} P{para_num}: {num_sentences} sentences, {len(videos)} videos found.")

        if len(videos) == 0:
            # Fallback if no videos exist (e.g. some paragraphs of part 2)
            print(f"  No videos for P{para_num}, skipping frame extraction.")
            continue

        # We need to extract num_sentences unique frames total.
        # We will distribute the extraction among the available videos.
        frames_per_video = {}
        for v in videos:
            frames_per_video[v] = []

        # Simple round-robin distribution of frames to extract
        for s_idx in range(num_sentences):
            video_to_use = videos[s_idx % len(videos)]
            # We want to extract at different timestamps
            # Let's space them between 0.5s and 4.2s (safe for 5s videos)
            frame_num_for_this_video = len(frames_per_video[video_to_use])
            timestamp = 0.5 + frame_num_for_this_video * 0.9
            if timestamp > 4.5: # Cap at 4.5s to fit in 5s videos
                timestamp = 4.5
            
            frames_per_video[video_to_use].append((s_idx, timestamp))

        for v, extractions in frames_per_video.items():
            video_path = os.path.join(para_video_dir, v)
            name_without_ext = os.path.splitext(v)[0]
            
            for s_idx, timestamp in extractions:
                # Target filename: 03_01_01_s0.jpg, 03_01_01_s1.jpg, etc.
                out_filename = f"{name_without_ext}_s{s_idx}.jpg"
                out_path = os.path.join(out_dir, out_filename)

                # Extract
                print(f"  Extracting frame {s_idx} from {v} at {timestamp}s -> {out_filename}")
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-ss", f"{timestamp:.2f}",
                    "-i", video_path,
                    "-frames:v", "1",
                    "-q:v", "2",
                    out_path
                ]
                try:
                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                except Exception as e:
                    print(f"    Failed to extract: {e}")

    print("Frame extraction complete.")

if __name__ == "__main__":
    main()
