import os
import shutil
import re

# Source and destination paths
workspace = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
src_dir = os.path.join(workspace, "img", "screenshots")
dest_base = os.path.join(workspace, "img", "comic")

# Create target directories
dirs = {
    "01": os.path.join(dest_base, "dil_1"),
    "02": os.path.join(dest_base, "dil_2"),
    "03": os.path.join(dest_base, "dil_3")
}

for d in dirs.values():
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)
        print(f"Created directory: {d}")

# Copy screenshots
if os.path.exists(src_dir):
    for filename in os.listdir(src_dir):
        src_file = os.path.join(src_dir, filename)
        if os.path.isfile(src_file) and (filename.endswith(".jpg") or filename.endswith(".png")):
            prefix = filename[:2]
            if prefix in dirs:
                dest_file = os.path.join(dirs[prefix], filename)
                shutil.copy2(src_file, dest_file)
                print(f"Copied {filename} -> {dirs[prefix]}")

# Create index_v2.html
index_path = os.path.join(workspace, "index.html")
index_v2_path = os.path.join(workspace, "index_v2.html")

if os.path.exists(index_path):
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace image paths in HTML
    content = content.replace("img/screenshots/01_", "img/comic/dil_1/01_")
    content = content.replace("img/screenshots/02_", "img/comic/dil_2/02_")
    content = content.replace("img/screenshots/03_", "img/comic/dil_3/03_")

    with open(index_v2_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Created index_v2.html with updated paths.")
else:
    print("Error: index.html not found.")
