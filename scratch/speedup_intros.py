import os
import subprocess

base_dir = 'z:/MISS3 Dropbox/Server Data/printednest/Antigravity/architekt_prazdnoty/video'

for i in [1, 2, 3]:
    video_file = os.path.join(base_dir, f'dil_{i}', f'0{i}_intro.mp4')
    if not os.path.exists(video_file):
        continue
        
    # Get exact duration
    cmd_probe = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', video_file
    ]
    result = subprocess.run(cmd_probe, capture_output=True, text=True)
    try:
        duration = float(result.stdout.strip())
    except:
        continue
        
    print(f"Dil {i} original duration: {duration}s")
    
    factor = 10.0 / duration
    print(f"Speeding up by factor: {1/factor:.2f}x to make it 10s")
    
    tmp_out = os.path.join(base_dir, f'dil_{i}', f'0{i}_intro_10s.mp4')
    
    cmd_ffmpeg = [
        'ffmpeg', '-y', '-i', video_file,
        '-vf', f'setpts={factor:.4f}*PTS',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-an',
        tmp_out
    ]
    
    subprocess.run(cmd_ffmpeg, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if os.path.exists(tmp_out):
        os.remove(video_file)
        os.rename(tmp_out, video_file)
        print(f"Dil {i} intro adjusted to 10s.")
