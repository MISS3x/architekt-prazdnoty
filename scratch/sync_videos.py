import os
import re
import shutil

html_path = "z:\\MISS3 Dropbox\\Server Data\\printednest\\Antigravity\\architekt_prazdnoty\\index.html"
base_dir = "z:\\MISS3 Dropbox\\Server Data\\printednest\\Antigravity\\architekt_prazdnoty"

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find comic panels
panel_pattern = re.compile(
    r'(<div[^>]*class="[^"]*comic-panel[^"]*"[^>]*data-i="(\d+)"[^>]*data-sentence="(\d+)"[^>]*>.*?<img[^>]*src="img/comic/dil_(\d+)/([^"]+)"[^>]*>)',
    re.IGNORECASE | re.DOTALL
)

expected_images = set()
expected_videos = set()
expected_mobiles = set()

renamed_count = 0

for match in panel_pattern.finditer(content):
    data_i = int(match.group(2))
    data_sentence = int(match.group(3))
    part = int(match.group(4))
    
    if part != 1:
        continue # only processing dil_1
        
    part_str = f"{part:02d}"
    para_str = f"{data_i + 1:02d}"
    sub_str = f"{data_sentence + 1:02d}"
    
    new_base = f"{part_str}_{para_str}_{sub_str}"
    
    expected_image = f"{new_base}.jpg"
    expected_video = f"{new_base}.mp4"
    expected_mobile = f"{new_base}_mobile.mp4"
    
    expected_images.add(expected_image)
    expected_videos.add(expected_video)
    expected_mobiles.add(expected_mobile)
    
    # Check old video formats
    old_base_v1 = f"{part_str}_{para_str}_{data_i+1:02d}_s{data_sentence}"
    old_base_v2 = f"{part_str}_{data_i+1:02d}_01_s{data_sentence}"
    old_base_v3 = f"{part_str}_{para_str}_01_s{data_sentence}"
    
    video_dir = os.path.join(base_dir, "video", f"dil_{part}")
    if not os.path.exists(video_dir):
        continue
        
    expected_video_path = os.path.join(video_dir, expected_video)
    if not os.path.exists(expected_video_path):
        possible_old_names = [f"{old_base_v2}.mp4", f"{old_base_v1}.mp4", f"{old_base_v3}.mp4"]
        for old_name in possible_old_names:
            old_path = os.path.join(video_dir, old_name)
            if os.path.exists(old_path):
                print(f"Renaming video: {old_name} -> {expected_video}")
                os.rename(old_path, expected_video_path)
                renamed_count += 1
                
                # Mobile rename
                old_mobile = old_name.replace(".mp4", "_mobile.mp4")
                old_mobile_path = os.path.join(video_dir, old_mobile)
                if os.path.exists(old_mobile_path):
                    expected_mobile_path = os.path.join(video_dir, expected_mobile)
                    os.rename(old_mobile_path, expected_mobile_path)
                break

print(f"Total videos renamed: {renamed_count}")

# CLEANUP UNUSED FILES
deleted_images = 0
img_dir = os.path.join(base_dir, "img", "comic", "dil_1")
if os.path.exists(img_dir):
    for f in os.listdir(img_dir):
        if os.path.isfile(os.path.join(img_dir, f)):
            if f.endswith(".jpg") or f.endswith(".png"):
                if f not in expected_images:
                    print(f"Deleting unused image: {f}")
                    os.remove(os.path.join(img_dir, f))
                    deleted_images += 1

deleted_videos = 0
video_dir = os.path.join(base_dir, "video", "dil_1")
missing_mobiles = []

if os.path.exists(video_dir):
    for f in os.listdir(video_dir):
        filepath = os.path.join(video_dir, f)
        if os.path.isfile(filepath) and f.endswith(".mp4"):
            if f not in expected_videos and f not in expected_mobiles:
                print(f"Deleting unused video: {f}")
                os.remove(filepath)
                deleted_videos += 1
            elif f in expected_videos:
                # Check if this valid video is missing its mobile version
                mobile_f = f.replace(".mp4", "_mobile.mp4")
                if not os.path.exists(os.path.join(video_dir, mobile_f)):
                    missing_mobiles.append(f)

print(f"Deleted {deleted_images} unused images and {deleted_videos} unused videos.")
print(f"Needs mobile version generation: {len(missing_mobiles)} videos.")

# Generate a batch script for ffmpeg
batch_path = os.path.join(base_dir, "scratch", "generate_mobiles.bat")
with open(batch_path, "w") as b:
    for f in expected_videos:
        # User requested to "replace oldones, and geeneratee neew onees" 
        # so we will generate mobile versions for ALL expected videos, replacing existing ones.
        in_path = os.path.join(video_dir, f)
        out_path = os.path.join(video_dir, f.replace(".mp4", "_mobile.mp4"))
        if os.path.exists(in_path):
            # Scale to width 720, maintain aspect, then crop to 720:1280
            b.write(f'ffmpeg -y -i "{in_path}" -vf "scale=\'max(720,iw*1280/ih)\':\'max(1280,ih*720/iw)\',crop=720:1280" -c:v libx264 -crf 23 -preset fast -c:a copy "{out_path}"\n')

print(f"Generated FFmpeg batch script at {batch_path}")
