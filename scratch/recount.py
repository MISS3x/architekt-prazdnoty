import re

with open('index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

def count_panels(html_str, part_id, max_para):
    try:
        if part_id == 3:
            part_content = html_str.split(f'id="comic-content-part{part_id}"')[1]
        else:
            part_content = html_str.split(f'id="comic-content-part{part_id}"')[1].split(f'id="comic-content-part{part_id+1}"')[0]
        
        panels = re.findall(r'<div[^>]*class="[^"]*comic-panel[^"]*"[^>]*data-i="(\d+)"', part_content)
        counts = {}
        for p in panels:
            val = int(p)
            counts[val] = counts.get(val, 0) + 1
        
        # We need to find the offset. Part 1 uses data-i 0 to 19.
        # Part 2 uses data-i 20 to 31 (12 paragraphs).
        # Part 3 uses data-i 32 to 46 (15 paragraphs).
        if part_id == 1:
            start = 0
            end = 20
        elif part_id == 2:
            start = 20
            end = 32
        else:
            start = 32
            end = 47
            
        arr = [counts.get(i, 0) for i in range(start, end)]
        print(f"PART {part_id} COUNTS:", arr)
        return arr
    except Exception as e:
        print(f"Error part {part_id}:", e)
        return []

count_panels(html, 1, 20)
count_panels(html, 2, 12)
count_panels(html, 3, 15)
