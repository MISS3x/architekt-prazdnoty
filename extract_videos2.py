import re
import collections

html = open('z:/MISS3 Dropbox/Server Data/printednest/Antigravity/architekt_prazdnoty/index.html', 'r', encoding='utf-8').read()

videos = re.findall(r'data-video="([^"]+)"', html)
v_dict = collections.defaultdict(list)

for v in videos:
    if 'dil_1' in v:
        v_dict[1].append(v)
    elif 'dil_2' in v:
        v_dict[2].append(v)
    elif 'dil_3' in v:
        v_dict[3].append(v)

for i in range(1, 4):
    unique_v = []
    for vid in v_dict[i]:
        if vid not in unique_v:
            unique_v.append(vid)
    print(f'Part {i}: {len(unique_v)} videos')
    with open(f'videos_part_{i}.txt', 'w', encoding='utf-8') as f:
        for vid in unique_v:
            f.write(vid + '\n')
