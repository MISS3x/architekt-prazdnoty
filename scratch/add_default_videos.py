import re

def get_part(global_i):
    if global_i < 20: return 1
    if global_i < 32: return 2
    return 3

html_path = "z:\\MISS3 Dropbox\\Server Data\\printednest\\Antigravity\\architekt_prazdnoty\\index_v2.html"

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Zpracujeme panely postupně nahrazováním pomocí funkce
def replace_panel(match):
    full_tag = match.group(0)
    
    # Extrakt data-i a data-sentence
    i_match = re.search(r'data-i="(\d+)"', full_tag)
    s_match = re.search(r'data-sentence="(\d+)"', full_tag)
    
    if not i_match or not s_match:
        return full_tag
        
    global_i = int(i_match.group(1))
    sentence_idx = int(s_match.group(1))
    
    # Jen dil 2 a 3
    part = get_part(global_i)
    if part == 1:
        return full_tag
        
    # Pokud uz data-video má
    if 'data-video=' in full_tag:
        return full_tag
        
    # Vytvořime defaultní cestu
    part_str = f"{part:02d}"
    para_str = f"{global_i + 1:02d}"
    sub_str = f"{sentence_idx + 1:02d}"
    
    video_path = f"video/dil_{part}/{part_str}_{para_str}_{sub_str}.mp4"
    
    # Vlozime data-video pred data-i nebo na konec otviraciho divu
    # Nejjednodussi je pridat to hned pred konec tagu ">"
    new_tag = full_tag.rstrip(' >') + f' data-video="{video_path}">'
    return new_tag

new_content = re.sub(r'<div\s+class="[^"]*comic-panel[^"]*"[^>]*>', replace_panel, content)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("index_v2.html updated with default data-video tags for Part 2 and 3!")
