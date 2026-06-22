import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
app_path = os.path.join(base_dir, "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

print("--- Word wrapping / splitting in app.js ---")
# Find references to .word or splitting paragraphs
matches = re.finditer(r'(\.split\([\s\S]*?\))', code)
lines = code.splitlines()
for idx, line in enumerate(lines):
    if "class=\"word\"" in line or "class=\'word\'" in line or "span.word" in line or "wrap" in line:
        print(f"Line {idx+1}: {line.strip()[:120]}")
