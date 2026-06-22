import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- defaultCues or cues definition in app.js ---")
# Find defaultCues definition or similar arrays
match = re.search(r'(const defaultCues\s*=\s*\[[\s\S]*?\];)', code)
if match:
    print(match.group(1)[:500])
else:
    print("defaultCues definition not found as simple array.")
    
# Let's search for any arrays containing cues
matches = re.finditer(r'(cues\s*=\s*\[[\s\S]*?\])', code)
for m in matches:
    print(m.group(1)[:200])
