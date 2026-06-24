import re

with open("comic_editor.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace all `/api/` fetch calls with `http://localhost:3000/api/`
content = re.sub(r"fetch\(['\"]/api/([^'\"]+)['\"]\)", r"fetch('http://localhost:3000/api/\1')", content)

# There are also some template literal fetches, like fetch(`/api/panels/${id}`)
content = re.sub(r"fetch\(`/api/([^`]+)`\)", r"fetch(`http://localhost:3000/api/\1`)", content)

with open("comic_editor.html", "w", encoding="utf-8") as f:
    f.write(content)

print("comic_editor.html fetch URLs updated to absolute localhost:3000")
