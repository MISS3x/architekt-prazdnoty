import re

with open("app.js", "r", encoding="utf-8") as f:
    app_content = f.read()

# Replace btn-nav-gallery with btn-mode-gallery in UI listeners
app_content = app_content.replace(
    'const btnGallery = document.getElementById("btn-nav-gallery");',
    'const btnGallery = document.getElementById("btn-mode-gallery");'
)

# Replace the array of mode buttons to include btn-mode-gallery if not already there
# Actually, wait, btn-mode-gallery is now the button that toggles the gallery.
# So if they click Audio, Film, etc., it should close gallery.
# This is already handled in:
# ["btn-mode-text", "btn-mode-comic", "btn-mode-movie", "btn-mode-audio"].forEach(id => {

# Also, when they click btn-mode-gallery, it toggles gallery-open.
# But we also want to toggle the active class on btn-mode-gallery.
app_content = app_content.replace(
    'document.body.classList.toggle("gallery-open");',
    'document.body.classList.toggle("gallery-open");\n        if(btnGallery) btnGallery.classList.toggle("active", document.body.classList.contains("gallery-open"));'
)

app_content = app_content.replace(
    'const closeGallery = () => document.body.classList.remove("gallery-open");',
    'const closeGallery = () => { document.body.classList.remove("gallery-open"); if(document.getElementById("btn-mode-gallery")) document.getElementById("btn-mode-gallery").classList.remove("active"); };'
)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(app_content)

print("app.js gallery button updated.")

# Remove btn-nav-gallery from index.html if we don't need it in ap-row2 anymore
with open("index.html", "r", encoding="utf-8") as f:
    index_content = f.read()

index_content = re.sub(
    r'<button class="ap-gal" id="btn-nav-gallery".*?</button>',
    '',
    index_content,
    flags=re.DOTALL
)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(index_content)

print("index.html gallery button removed from row2.")
