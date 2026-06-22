import os
import subprocess
import glob

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    video_dir = os.path.join(base_dir, "video")
    out_dir = os.path.join(base_dir, "img", "screenshots")
    os.makedirs(out_dir, exist_ok=True)

    # Find all mp4 files
    mp4_files = glob.glob(os.path.join(video_dir, "dil_*", "*.mp4"))
    print(f"Found {len(mp4_files)} video files.")

    for video_path in mp4_files:
        filename = os.path.basename(video_path)
        name_without_ext = os.path.splitext(filename)[0]
        out_path = os.path.join(out_dir, f"{name_without_ext}.jpg")

        # Skip if already exists
        if os.path.exists(out_path):
            continue

        print(f"Extracting frame from {filename} -> {name_without_ext}.jpg")
        # Extract frame at 1.0s, fallback to start if fails
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", "00:00:01.0",
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "2",
            out_path
        ]
        
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            # Try at 0.0s if 1.0s failed (e.g. video too short)
            print(f"1.0s extraction failed for {filename}, trying 0.0s...")
            cmd_fallback = [
                "ffmpeg",
                "-y",
                "-ss", "00:00:00.0",
                "-i", video_path,
                "-frames:v", "1",
                "-q:v", "2",
                out_path
            ]
            try:
                subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            except Exception as ex:
                print(f"Failed to extract frame for {filename}: {ex}")

    print("Extraction complete.")

if __name__ == "__main__":
    main()
