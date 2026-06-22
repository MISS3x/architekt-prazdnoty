import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Find lines containing play-btn
lines = code.splitlines()
for idx, line in enumerate(lines):
    if 'play-btn' in line or 'playBtn' in line:
        print(f"Line {idx+1}: {line.strip()}")
