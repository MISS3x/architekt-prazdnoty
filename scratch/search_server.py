import os
import re

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
server_path = os.path.join(base_dir, "editor_server.js")

with open(server_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "comic-panel" in line:
        print(f"Line {idx+1}: {line.strip()}")
