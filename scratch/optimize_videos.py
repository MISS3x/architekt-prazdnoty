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
    if vid_path.endswith('_mobile.mp4'):
        return

    mobile_path = vid_path.replace('.mp4', '_mobile.mp4')
    tmp_path = vid_path.replace('.mp4', '_tmp.mp4')

    print(f"Processing {vid_path}...")

    # 1. Generate mobile version (600x600)
    cmd_mobile = [
        "ffmpeg", "-y", "-i", vid_path, 
        "-vf", "scale=600:600", 
        "-c:a", "copy", mobile_path
    ]
    subprocess.run(cmd_mobile, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Generate desktop version (900x900) into tmp file
    cmd_desktop = [
        "ffmpeg", "-y", "-i", vid_path, 
        "-vf", "scale=900:900", 
        "-c:a", "copy", tmp_path
    ]
    subprocess.run(cmd_desktop, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(tmp_path):
        success = robust_replace(tmp_path, vid_path)
        if not success:
            print(f"FAILED to replace {vid_path} after retries.")

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    os.chdir(base_dir)

    videos = glob.glob('video/**/*.mp4', recursive=True)
    videos = [v for v in videos if not v.endswith('_mobile.mp4') and not v.endswith('_tmp.mp4')]

    print(f"Found {len(videos)} videos to process. Starting batch processing...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as executor:
        list(executor.map(process_video, videos))

    print("Finished optimizing all videos!")

if __name__ == "__main__":
    main()
