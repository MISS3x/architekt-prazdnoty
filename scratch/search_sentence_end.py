import os
import re

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- SENTENCE_END in app.js ---")
lines = code.splitlines()
for idx, line in enumerate(lines):
    if "SENTENCE_END" in line:
        print(f"Line {idx+1}: {line.strip()}")
