import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- Sentence cues / matching in app.js ---")
lines = code.splitlines()
for idx, line in enumerate(lines):
    if "sentence" in line.lower() or "cue" in line.lower():
        if any(w in line for w in ["duration", "time", "length", "diff", "loop"]):
            print(f"Line {idx+1}: {line.strip()[:120]}")
