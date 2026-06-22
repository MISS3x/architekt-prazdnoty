import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

for i in [4, 12, 13, 14, 24]:
    # Find any tag with data-i="i"
    matches = re.findall(rf'(<[^>]*data-i="{i}"[^>]*>)', html)
    print(f"data-i={i} found in tags: {matches}")
