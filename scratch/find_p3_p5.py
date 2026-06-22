import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's print everything between <p data-i="3" and <p data-i="5"
lines = html.splitlines()
idx_3 = -1
idx_5 = -1
for idx, line in enumerate(lines):
    if 'data-i="3"' in line:
        idx_3 = idx
    if 'data-i="5"' in line:
        idx_5 = idx

if idx_3 != -1 and idx_5 != -1:
    print(f"Content between line {idx_3+1} and {idx_5+1}:")
    for i in range(idx_3, idx_5+1):
        print(f"{i+1:4d}: {lines[i]}")
else:
    print(f"Indices not found: idx_3={idx_3}, idx_5={idx_5}")
