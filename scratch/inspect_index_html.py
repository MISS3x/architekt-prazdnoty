import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Search for any <img tags or image sources
img_tags = re.findall(r'<img[^>]*>', html)
print(f"Total img tags in index.html: {len(img_tags)}")
for t in img_tags[:10]:
    print(t)
