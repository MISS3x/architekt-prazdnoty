import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
index_path = os.path.join(base_dir, "index_v2.html")

with open(index_path, "r", encoding="utf-8") as f:
    html = f.read()

# Let's search for video tags in film section
print("--- Video elements in index_v2.html ---")
matches = re.findall(r'<video[^>]*>', html)
for m in matches[:20]:
    print(m)

# Find the section or script where film data (like videos and cues) is loaded or handled
print("\n--- Script block or data references to video cues ---")
script_matches = re.finditer(r'<script>([\s\S]*?)</script>', html)
for idx, m in enumerate(script_matches):
    content = m.group(1)
    if "video" in content or "cue" in content or "cues" in content:
        print(f"Script #{idx} (length={len(content)}):")
        # Print first few lines containing cue/video
        for line in content.splitlines():
            if any(w in line for w in ["cue", "video", "film", "movie"]):
                print("  ", line.strip()[:100])
