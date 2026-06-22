import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# Let's look for definitions like cues, video metadata, or functions related to movie/film version.
print("--- Video/Film functions in app.js ---")
pattern = re.compile(r'function\s+(\w+)\s*\(.*?\)|const\s+(\w+)\s*=\s*\(.*?\)\s*=>', re.IGNORECASE)
for m in pattern.finditer(code):
    func_name = m.group(1) or m.group(2)
    if any(w in func_name.lower() for w in ["video", "film", "movie", "cue"]):
        print(f"Function: {func_name}")

# Let's search for text lines containing "cue" or "dil_" or video paths
print("\n--- Cue or video path definitions in app.js ---")
lines = code.splitlines()
for idx, line in enumerate(lines):
    if any(w in line for w in ["cues", "cues[", "video/", "videoSrc"]):
        print(f"Line {idx+1}: {line.strip()[:120]}")
