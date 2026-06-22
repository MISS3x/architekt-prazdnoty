import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search for id="..."
ids = re.findall(r'id="([^"]+)"', html)
print("All IDs in index.html:")
print(sorted(list(set(ids))))
