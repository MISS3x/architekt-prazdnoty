import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
index_path = os.path.join(base_dir, "index_v2.html")

with open(index_path, "r", encoding="utf-8") as f:
    html = f.read()

panel_regex = re.compile(r'<div\s+class="comic-panel[^"]*"([^>]*?)>.*?<img\s+src="([^"]+)"', re.DOTALL)

matches = list(panel_regex.finditer(html))
for idx in [0, 1, 2]:
    if idx < len(matches):
        m = matches[idx]
        print(f"--- Match #{idx} full text ---")
        print(html[m.start():m.end()])
