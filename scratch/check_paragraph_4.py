import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find <p data-i="4"
match = re.search(r'<p\s+data-i="4"[^>]*>([\s\S]*?)<\/p>', html)
if match:
    print("Found Paragraph 4:")
    print(match.group(1).strip())
else:
    print("Paragraph 4 NOT FOUND!")
