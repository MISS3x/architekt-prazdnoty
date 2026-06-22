import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    app_js_path = os.path.join(base_dir, "app.js")

    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Fix player-archive-title null errors
    js = re.sub(r'document\.getElementById\("player-archive-title"\)\.textContent = (.+?);', 
                r'const pat = document.getElementById("player-archive-title"); if (pat) pat.textContent = \1;', js)

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

if __name__ == "__main__":
    main()
