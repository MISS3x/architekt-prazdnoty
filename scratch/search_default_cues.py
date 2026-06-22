import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- defaultCues or seedCues in app.js ---")
match = re.search(r'(const\s+PART\d+_CUES[\s\S]*?);', code)
if match:
    print(match.group(1))

# Let's search for "seedCues"
match2 = re.search(r'(function\s+seedCues[\s\S]*?\})', code)
if match2:
    print(match2.group(1))
