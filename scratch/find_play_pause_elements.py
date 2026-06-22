import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's find matches where elements are toggled when audio plays or pauses
# Look for functions like togglePlay, play(), pause(), onPlay, onPause, or references to barPlay, etc.
lines = code.splitlines()
print("Toggles or play/pause state changes in app.js:")
for idx, line in enumerate(lines):
    if any(k in line for k in ['playing', 'paused', 'bar-play', 'togglePlay', 'PLAY_SVG', 'PAUSE_SVG']):
        print(f"Line {idx+1:4d}: {line.strip()}")
