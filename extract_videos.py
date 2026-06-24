import re
import collections

html_path = 'z:/MISS3 Dropbox/Server Data/printednest/Antigravity/architekt_prazdnoty/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

videos_per_part = collections.defaultdict(list)

# Split by story-content-part
parts = html.split('id="story-content-part')
for i in range(1, 4):
    for part_html in parts:
        if part_html.startswith(str(i) + '">'):
            # find all data-video
            matches = re.findall(r'data-video="([^"]+)"', part_html)
            videos_per_part[i].extend(matches)
            
            # find all img src
            matches_img = re.findall(r'<img[^>]+src="img/screenshots/([^"]+)"', part_html)
            for m in matches_img:
                base = m.split('.')[0]
                videos_per_part[i].append(f'video/{base}.mp4')

for k, v in videos_per_part.items():
    unique_v = []
    for vid in v:
        if vid not in unique_v:
            unique_v.append(vid)
    print(f'Part {k}: {len(unique_v)} videos')
    
    with open(f'videos_part_{k}.txt', 'w', encoding='utf-8') as f:
        for vid in unique_v:
            f.write(vid + '\n')
