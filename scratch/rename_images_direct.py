import re
import os

with open("index_v2.html", "r", encoding="utf-8") as f:
    html = f.read()

def rename_file(old_path, new_path):
    if os.path.exists(old_path):
        if os.path.exists(new_path):
            os.rename(new_path, new_path + ".bak")
            print(f"Backed up {new_path}")
        os.rename(old_path, new_path)
        print(f"Renamed {old_path} -> {new_path}")

def fix_names_direct(part, file_prefix, threshold_offset):
    global html
    pattern = rf'img/comic/dil_{part}/{file_prefix}_(\d\d)_(\d\d)(_desktop_tmp)?\.jpg'
    
    matches = set(re.findall(pattern, html))
    matches_sorted = sorted(matches, key=lambda m: int(m[0]))
    
    for m in matches_sorted:
        p_str, s_str, desk_tmp = m
        p = int(p_str)
        
        # Only rename if it's strictly greater than the threshold offset 
        # (meaning it's the old 02_21_... format)
        if p > threshold_offset:
            orig_name = f"{file_prefix}_{p_str}_{s_str}{desk_tmp}.jpg"
            orig_path = f"img/comic/dil_{part}/{orig_name}"
            
            new_p = p - threshold_offset
            new_p_str = f"{new_p:02d}"
            
            new_name = f"{file_prefix}_{new_p_str}_{s_str}{desk_tmp}.jpg"
            new_path = f"img/comic/dil_{part}/{new_name}"
            
            html = html.replace(f"img/comic/dil_{part}/{orig_name}", f"img/comic/dil_{part}/{new_name}")
            rename_file(orig_path, new_path)

fix_names_direct(2, "02", 20)
fix_names_direct(3, "03", 32)

with open("index_v2.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Renamed images directly to 1-based index per part.")
