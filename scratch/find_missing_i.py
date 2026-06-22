import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's find all occurrences of <p> tags and see what surrounds them
matches = re.finditer(r'(<p(?![^>]*data-i=)[^>]*>([\s\S]*?)<\/p>)', html)
for idx, m in enumerate(matches):
    print(f"Match {idx+1}:")
    print(m.group(1).strip()[:200])
    print("-" * 50)
