import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- buildSentenceTimes definition in app.js ---")
match = re.search(r'(const buildSentenceTimes\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};)', code)
if match:
    print(match.group(1))
else:
    # Try finding function declaration
    match2 = re.search(r'(function buildSentenceTimes\s*\(\)\s*\{[\s\S]*?\})', code)
    if match2:
        print(match2.group(1))
    else:
        print("buildSentenceTimes definition not found.")
