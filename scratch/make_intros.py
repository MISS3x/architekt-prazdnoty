import os
import glob
import subprocess

base_dir = 'z:/MISS3 Dropbox/Server Data/printednest/Antigravity/architekt_prazdnoty/video'
tmp_dir = os.path.join(base_dir, 'tmp_intro')

if not os.path.exists(tmp_dir):
    os.makedirs(tmp_dir)

def create_intro(dil_num):
    video_dir = os.path.join(base_dir, f'dil_{dil_num}')
    # Find base videos
    videos = glob.glob(os.path.join(video_dir, '*.mp4'))
    base_videos = sorted([v for v in videos if not any(x in v for x in ['_mobile', '_tmp', '_mask', 'intro'])])
    
    if not base_videos:
        print(f"No videos found for Dil {dil_num}")
        return
        
    print(f"Processing Dil {dil_num} with {len(base_videos)} videos...")
    
    tmp_files = []
    
    # Process each video
    for i, vid in enumerate(base_videos):
        tmp_file = os.path.join(tmp_dir, f'd{dil_num}_clip_{i:03d}.mp4')
        # Extract 0.5s, crop to square, scale to 1080x1080, standard x264 format, no audio
        cmd = [
            'ffmpeg', '-y', '-i', vid, '-t', '0.5',
            '-vf', "crop='min(iw,ih)':'min(iw,ih)',scale=1080:1080,setsar=1",
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-an',
            tmp_file
        ]
        
        # Run ffmpeg silently
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(tmp_file):
            tmp_files.append(tmp_file)
            
    if not tmp_files:
        print(f"Failed to process any clips for Dil {dil_num}")
        return
        
    # Write concat list
    concat_list_path = os.path.join(tmp_dir, f'concat_list_{dil_num}.txt')
    with open(concat_list_path, 'w', encoding='utf-8') as f:
        for tf in tmp_files:
            f.write(f"file '{tf}'\n")
            
    # Concatenate
    output_file = os.path.join(video_dir, 'intro.mp4')
    cmd_concat = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list_path,
        '-c', 'copy', output_file
    ]
    subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print(f"Created {output_file}")
    
    # Clean up
    for tf in tmp_files:
        os.remove(tf)
    os.remove(concat_list_path)

for d in [1, 2, 3]:
    create_intro(d)
    
# remove tmp dir if empty
try:
    os.rmdir(tmp_dir)
except OSError:
    pass
