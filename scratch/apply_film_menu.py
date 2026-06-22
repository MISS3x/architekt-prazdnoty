import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    
    # 1. Update style.css
    css_path = os.path.join(base_dir, "style.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    # Increase z-index of top-nav
    css = re.sub(r'(\.top-nav\s*\{[^}]*z-index:\s*)1000(;\s*[^}]*\})', r'\g<1>99999\g<2>', css)
    
    # Hide close button
    css = css + "\n\n/* Hide fullscreen close button as we use top-nav now */\n.fullscreen-close-btn { display: none !important; }\n"

    # Add padding to fs-video-container to account for top-nav
    css = css + "\n/* Add top padding so video is not hidden behind the menu */\n.fullscreen-overlay { padding-top: 80px !important; }\n"
    
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css)
        
    # 2. Add smooth scrolling to app.js (from previous request)
    app_js_path = os.path.join(base_dir, "app.js")
    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    target = 'p.classList.toggle("active", on);'
    replacement = """p.classList.toggle("active", on);
      if (on && !state.comicMode && !state.fullscreenMode) {
        if (Date.now() - lastUserScrollTime > AUTO_SCROLL_INACTIVITY_MS) {
          p.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }"""
    
    if "p.scrollIntoView" not in js:
        js = js.replace(target, replacement)

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

if __name__ == "__main__":
    main()
