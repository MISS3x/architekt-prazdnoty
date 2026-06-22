import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

p_indices = [int(m) for m in re.findall(r'<p\s+data-i="(\d+)"', html)]
print("Existing paragraph indices:", sorted(p_indices))

# Also search for any p tags in general to see if some are missing data-i
p_tags_without_i = re.findall(r'<p(?![^>]*data-i=)[^>]*>', html)
print("P tags without data-i count:", len(p_tags_without_i))
