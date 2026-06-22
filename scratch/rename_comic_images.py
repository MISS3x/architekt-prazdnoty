import os
import re
import shutil
import uuid

html_path = "z:\\MISS3 Dropbox\\Server Data\\printednest\\Antigravity\\architekt_prazdnoty\\index.html"
base_dir = "z:\\MISS3 Dropbox\\Server Data\\printednest\\Antigravity\\architekt_prazdnoty"

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

panel_pattern = re.compile(
    r'(<div[^>]*class="[^"]*comic-panel[^"]*"[^>]*data-i="(\d+)"[^>]*data-sentence="(\d+)"[^>]*>.*?<img[^>]*src="img/comic/dil_(\d+)/([^"]+)"[^>]*>)',
    re.IGNORECASE | re.DOTALL
)

new_content = content
renamed_count = 0
not_found_count = 0

moves = []

# Collect all moves
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
        old_path = os.path.join(base_dir, "img", "comic", f"dil_{part}", old_filename)
        new_path = os.path.join(base_dir, "img", "comic", f"dil_{part}", new_filename)
        tmp_path = os.path.join(base_dir, "img", "comic", f"dil_{part}", f"tmp_{uuid.uuid4().hex[:8]}.jpg")
        moves.append((old_path, tmp_path, new_path, old_filename, new_filename, part, full_block))

# Step 1: Rename everything to a tmp name to avoid collision
for old_path, tmp_path, new_path, old_filename, new_filename, part, full_block in moves:
    if os.path.exists(old_path):
        os.rename(old_path, tmp_path)
    else:
        print(f"Warning: File not found {old_path}")

# Step 2: Rename from tmp name to final name and update HTML
for old_path, tmp_path, new_path, old_filename, new_filename, part, full_block in moves:
    if os.path.exists(tmp_path):
        if os.path.exists(new_path):
            os.remove(new_path) # overwrite safely
        os.rename(tmp_path, new_path)
        print(f"Renaming: {old_filename} -> {new_filename}")
        renamed_count += 1
        
        # Update HTML
        new_block = full_block.replace(f"img/comic/dil_{part}/{old_filename}", f"img/comic/dil_{part}/{new_filename}")
        new_content = new_content.replace(full_block, new_block)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"\\nDone! Renamed/Updated {renamed_count} images.")
