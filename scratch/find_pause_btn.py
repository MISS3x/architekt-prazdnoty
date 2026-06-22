import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

for file_path in ['index.html', 'index_v2.html', 'app.js']:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"\nOccurrences in {file_path}:")
    matches = re.finditer(r'([^\n]*(?:play-btn|play-btn-wrapper|play_btn|playBtn)[^\n]*)', content, re.IGNORECASE)
    count = 0
    for m in matches:
        print(f"  {m.group(1).strip()}")
        count += 1
        if count >= 30:
            print("  ...truncated...")
            break
