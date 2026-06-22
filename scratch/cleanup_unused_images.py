import os
import re
import glob

# 1. Parse index_v2.html to find all referenced comic images
index_path = 'index_v2.html'
with open(index_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find all matches of img src in comic-panels
# e.g., <img src="img/comic/dil_1/01_01_01.jpg"
referenced_images = set()
matches = re.findall(r'img/comic/dil_\d+/[^"\'\s>]+', html_content)
for m in matches:
    # Clean and get the filename
    filename = os.path.basename(m)
    referenced_images.add(filename)

print(f"Total referenced images in index_v2.html: {len(referenced_images)}")

# 2. List all images in img/comic/dil_1, dil_2, dil_3
image_folders = ['img/comic/dil_1', 'img/comic/dil_2', 'img/comic/dil_3']
all_physical_images = {}

for folder in image_folders:
    # Check if folder exists
    if not os.path.exists(folder):
        continue
    files = os.listdir(folder)
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            all_physical_images[f] = os.path.join(folder, f)

print(f"Total physical images found on disk: {len(all_physical_images)}")

# 3. Find unused images
unused_images = []
for filename, filepath in all_physical_images.items():
    if filename not in referenced_images:
        unused_images.append(filepath)

print(f"Total unused images to delete: {len(unused_images)}")

# Print some of them
for filepath in sorted(unused_images)[:30]:
    print(f"Unused: {filepath}")

# If there are unused images, delete them
if unused_images:
    print("\nDeleting unused images...")
    deleted_count = 0
    for filepath in unused_images:
        try:
            os.remove(filepath)
            deleted_count += 1
        except Exception as e:
            print(f"Error deleting {filepath}: {e}")
    print(f"Successfully deleted {deleted_count} unused images.")
else:
    print("No unused images found.")
