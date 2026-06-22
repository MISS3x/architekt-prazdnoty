import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the story-content-part1 container and print its paragraph elements
part1_match = re.search(r'<div\s+id="story-content-part1"[\s\S]*?<div\s+id="story-content-part2"', html)
if part1_match:
    part1_html = part1_match.group(0)
    p_tags = re.findall(r'<p\s+data-i="(\d+)"[^>]*>([\s\S]*?)<\/p>', part1_html)
    print("Story paragraphs in Part 1:")
    for idx, text in p_tags:
        print(f"data-i={idx}: {text.strip()[:100]}...")
else:
    print("Part 1 container not found")
