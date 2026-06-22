import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    prompts_path = os.path.join(base_dir, "story", "kling_prompts_dil_3.md")
    video_dir = os.path.join(base_dir, "video", "dil_3")

    if not os.path.exists(video_dir):
        print(f"Directory {video_dir} not found.")
        return

    # List all files in video/dil_3/
    video_files = os.listdir(video_dir)
    print(f"Found {len(video_files)} files in video/dil_3/")

    # Read prompts markdown
    with open(prompts_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all pattern occurrences like: #### 🎬 Video: 03_01_01.mp4 ❌ video missing
    # or #### 🎬 Video: 03_01_01.mp4
    pattern = r'#### 🎬 Video: (\[?03_\d+_\d+\.mp4)(.*?)(?=\n|###|$)'
    
    def replacer(match):
        video_filename = match.group(1)
        # Check if this file exists in the directory
        # Sometimes there's minor filename difference (like leading bracket)
        exists = video_filename in video_files
        
        if not exists:
            # Let's do a case-insensitive, fuzzy match check
            normalized_name = video_filename.lower().replace("[", "").replace("]", "")
            for f in video_files:
                f_norm = f.lower().replace("[", "").replace("]", "")
                if f_norm == normalized_name:
                    exists = True
                    break

        status = " ✅ VYGENEROVÁNO" if exists else " ❌ CHYBÍ ZÁBĚR"
        return f"#### 🎬 Video: {video_filename}{status}"

    new_content = re.sub(pattern, replacer, content)

    with open(prompts_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("Updated kling_prompts_dil_3.md successfully.")

if __name__ == "__main__":
    main()
