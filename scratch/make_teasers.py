import os
import subprocess

videos = {
    1: [
        "video/dil_1/01_01_01.mp4",
        "video/dil_1/01_06_01.mp4",
        "video/dil_1/01_08_01.mp4",
        "video/dil_1/01_13_01.mp4"
    ],
    2: [
        "video/dil_2/02_01_01.mp4",
        "video/dil_2/02_04_01.mp4",
        "video/dil_2/02_07_01.mp4",
        "video/dil_2/02_10_01.mp4"
    ],
    3: [
        "video/dil_3/03_01_01.mp4",
        "video/dil_3/03_05_01.mp4",
        "video/dil_3/03_10_01.mp4",
        "video/dil_3/03_15_01.mp4"
    ]
}

def create_teaser(part, files):
    out_path = f"video/teaser_{part}.mp4"
    if os.path.exists(out_path):
        os.remove(out_path)
    
    inputs = []
    for f in files:
        if os.path.exists(f):
            inputs.extend(["-i", f])
        else:
            print(f"Warning: {f} not found!")

    num_inputs = len(inputs) // 2
    if num_inputs == 0:
        return

    filter_complex = ""
    for i in range(num_inputs):
        filter_complex += f"[{i}:v]trim=duration=1.5,setpts=PTS-STARTPTS[v{i}]; "
    
    concat_str = "".join([f"[v{i}]" for i in range(num_inputs)])
    filter_complex += f"{concat_str}concat=n={num_inputs}:v=1:a=0[outv]"

    cmd = [
        "ffmpeg", "-y",
    ] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        out_path
    ]

    print(f"Creating {out_path}...")
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Done {out_path}")

for part, files in videos.items():
    create_teaser(part, files)
