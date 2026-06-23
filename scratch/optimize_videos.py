import os
import glob
import subprocess
import concurrent.futures
import time

def robust_replace(src, dst, retries=5, delay=1):
    for i in range(retries):
        try:
            os.replace(src, dst)
            return True
        except PermissionError:
            print(f"File locked, retrying {dst} in {delay}s...")
            time.sleep(delay)
    return False

def process_video(vid_path):
    if vid_path.endswith('_mobile.mp4') or vid_path.endswith('_tmp.mp4'):
        return

    mobile_path = vid_path.replace('.mp4', '_mobile.mp4')
    tmp_desktop_path = vid_path.replace('.mp4', '_desktop_tmp.mp4')
    tmp_mobile_path = vid_path.replace('.mp4', '_mobile_tmp.mp4')

    print(f"Processing {vid_path}...")

    # 1. Generate desktop version (1080x1080, no audio)
    cmd_desktop = [
        "ffmpeg", "-y", "-i", vid_path, 
        "-vf", "scale=1080:1080", 
        "-an", # remove audio
        "-c:v", "libx264", "-crf", "23", "-preset", "medium",
        tmp_desktop_path
    ]
    subprocess.run(cmd_desktop, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Generate mobile version (crop to 9:16, scale to 720x1280, no audio)
    # in_h is the height (1080 after scale, but we can do it in one chain from source)
    cmd_mobile = [
        "ffmpeg", "-y", "-i", vid_path, 
        "-vf", "scale=1080:1080,crop=ih*9/16:ih,scale=720:1280", 
        "-an", # remove audio
        "-c:v", "libx264", "-crf", "23", "-preset", "medium",
        tmp_mobile_path
    ]
    subprocess.run(cmd_mobile, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(tmp_desktop_path):
        success = robust_replace(tmp_desktop_path, vid_path)
        if not success:
            print(f"FAILED to replace {vid_path} after retries.")
            
    if os.path.exists(tmp_mobile_path):
        success = robust_replace(tmp_mobile_path, mobile_path)
        if not success:
            print(f"FAILED to replace {mobile_path} after retries.")

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    os.chdir(base_dir)

    # Process all stories (dil_1, dil_2, dil_3), skip root folder videos
    videos = []
    for d in ['dil_1', 'dil_2', 'dil_3']:
        videos.extend(glob.glob(f'video/{d}/**/*.mp4', recursive=True))
        
    videos = [v for v in videos if not v.endswith('_mobile.mp4') and not v.endswith('_tmp.mp4')]

    print(f"Found {len(videos)} story videos to process. Starting batch processing...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count() // 2 or 1) as executor:
        list(executor.map(process_video, videos))

    print("Finished optimizing all videos!")

if __name__ == "__main__":
    main()
