import re
with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

tags = set(re.findall(r'<([a-zA-Z0-9]+)\s+data-i="\d+"', html))
print("All tag names with data-i:", tags)
