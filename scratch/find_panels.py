import os
import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
index_path = os.path.join(base_dir, "index_v2.html")

with open(index_path, "r", encoding="utf-8") as f:
    html = f.read()

# Let's search for some panel markup
print("--- 01_01_01.jpg in HTML ---")
match = re.search(r'(<div class="comic-panel[^>]*>.*?01_01_01\.jpg.*?</div>)', html, re.DOTALL)
if match:
    print(match.group(1))

print("--- 01_01_02_custom.png in HTML ---")
match = re.search(r'(<div class="comic-panel[^>]*>.*?01_01_02_custom\.png.*?</div>)', html, re.DOTALL)
if match:
    print(match.group(1))

print("--- 03_03_02_s1.jpg in HTML ---")
match = re.search(r'(<div class="comic-panel[^>]*>.*?03_03_02_s1\.jpg.*?</div>)', html, re.DOTALL)
if match:
    print(match.group(1))
