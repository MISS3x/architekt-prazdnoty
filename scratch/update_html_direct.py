import re
import os

with open("index_v2.html", "r", encoding="utf-8") as f:
    html = f.read()

def update_html(part, file_prefix, threshold_offset):
    global html
    pattern = rf'img/comic/dil_{part}/{file_prefix}_(\d\d)_(\d\d)(_desktop_tmp)?\.jpg'
    
    matches = set(re.findall(pattern, html))
    
    for m in matches:
        p_str, s_str, desk_tmp = m
        p = int(p_str)
        
        if p > threshold_offset:
            orig_name = f"{file_prefix}_{p_str}_{s_str}{desk_tmp}.jpg"
            new_p = p - threshold_offset
            new_p_str = f"{new_p:02d}"
            new_name = f"{file_prefix}_{new_p_str}_{s_str}{desk_tmp}.jpg"
            
            html = html.replace(f"img/comic/dil_{part}/{orig_name}", f"img/comic/dil_{part}/{new_name}")

update_html(2, "02", 20)
update_html(3, "03", 32)

with open(r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty\index_v2.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Updated HTML.")
