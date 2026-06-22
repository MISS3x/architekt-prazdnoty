import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search for "01_05_01.jpg" and print 5 lines before and after
lines = html.splitlines()
for idx, line in enumerate(lines):
    if '01_05_01.jpg' in line and 'class="comic-panel-img"' in line:
        print(f"Line {idx+1}:")
        for i in range(max(0, idx-5), min(len(lines), idx+6)):
            print(f"{i+1:4d}: {lines[i]}")
        print("-" * 50)
