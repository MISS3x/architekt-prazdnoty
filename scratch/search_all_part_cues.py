import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

for p in [1, 2, 3]:
    match = re.search(fr'(const\s+PART{p}_CUES\s*=\s*\[[\s\S]*?\])', code)
    if match:
        print(match.group(1))
