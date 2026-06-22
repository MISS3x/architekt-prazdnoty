import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- PART_VIDEO_COUNTS in app.js ---")
lines = code.splitlines()
for idx, line in enumerate(lines):
    if "PART_VIDEO_COUNTS" in line:
        print(f"Line {idx+1}: {line.strip()}")
