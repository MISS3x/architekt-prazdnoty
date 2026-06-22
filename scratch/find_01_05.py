import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find any appearance of 01_05 in index_v2.html
matches = re.finditer(r'([^\n]*01_05[^\n]*)', html)
for m in matches:
    print(m.group(1).strip())
