import re

with open("comic_editor.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace any fetch('/api/ or fetch(`/api/ or fetch("/api/
content = re.sub(r"fetch\(['\"`]/api/", r"fetch('http://localhost:3000/api/", content)

with open("comic_editor.html", "w", encoding="utf-8") as f:
    f.write(content)

print("All fetches updated")
