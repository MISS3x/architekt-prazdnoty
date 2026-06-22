import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

panel_matches = re.finditer(r'(<div\s+class="comic-panel[^"]*"\s+data-i="(\d+)"\s+data-sentence="(\d+)">[\s\S]*?img/comic/dil_1/01_05_01[^\s\"\'\>]*[\s\S]*?<\/div>)', html)

for pm in panel_matches:
    print("MATCHED PANEL HTML:")
    print(pm.group(1))
    global_i = pm.group(2)
    sentence_idx = pm.group(3)
    print(f"data-i={global_i}, data-sentence={sentence_idx}")
    
    para_match = re.search(fr'<p\s+data-i="{global_i}"[^>]*>([\s\S]*?)<\/p>', html)
    if para_match:
        print("MATCHED PARAGRAPH TEXT:")
        print(para_match.group(1).strip())
    else:
        print(f"No paragraph found for data-i={global_i}")
    print("-" * 50)
