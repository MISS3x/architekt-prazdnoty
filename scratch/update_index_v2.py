import os
import re

html_path = "z:\\MISS3 Dropbox\\Server Data\\printednest\\Antigravity\\architekt_prazdnoty\\index_v2.html"

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

panel_pattern = re.compile(
    r'(<div[^>]*class="[^"]*comic-panel[^"]*"[^>]*data-i="(\d+)"[^>]*data-sentence="(\d+)"[^>]*>.*?<img[^>]*src="img/comic/dil_(\d+)/([^"]+)"[^>]*>)',
    re.IGNORECASE | re.DOTALL
)

new_content = content
updated_count = 0

for match in panel_pattern.finditer(content):
    full_block = match.group(1)
    data_i = int(match.group(2))
    data_sentence = int(match.group(3))
    part = int(match.group(4))
    old_filename = match.group(5)
    
    part_str = f"{part:02d}"
    para_str = f"{data_i + 1:02d}"
    sub_str = f"{data_sentence + 1:02d}"
    
    new_filename = f"{part_str}_{para_str}_{sub_str}.jpg"
    
    if old_filename != new_filename:
        # Update HTML
        new_block = full_block.replace(f"img/comic/dil_{part}/{old_filename}", f"img/comic/dil_{part}/{new_filename}")
        new_content = new_content.replace(full_block, new_block)
        updated_count += 1

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Updated {updated_count} references in index_v2.html")
