import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    
    # 1. Update generate_comic_html.py
    gen_path = os.path.join(base_dir, "scratch", "generate_comic_html.py")
    with open(gen_path, "r", encoding="utf-8") as f:
        gen_py = f.read()
    
    # Replace the conditional logic with a single speech-bubble block
    pattern = r'# Render bubble if it\'s a quote.*?</div>"""'
    replacement = '''# Render bubble for EVERY panel as requested
            panel_html += f"""
            <div class="speech-bubble">
              <span class="speech-text">{s_clean}</span>
              <div class="speech-pointer"></div>
            </div>"""'''
    
    gen_py_new = re.sub(pattern, replacement, gen_py, flags=re.DOTALL)
    with open(gen_path, "w", encoding="utf-8") as f:
        f.write(gen_py_new)
        
    # 2. Update app.js
    app_path = os.path.join(base_dir, "app.js")
    with open(app_path, "r", encoding="utf-8") as f:
        app_js = f.read()
        
    # Remove the forced quote logic
    pattern_js = r'if \(speechTextEl\) \{.*?\} else if \(captionPEl\)'
    replacement_js = '''if (speechTextEl) {
              speechTextEl.textContent = sText;
            } else if (captionPEl)'''
            
    app_js_new = re.sub(pattern_js, replacement_js, app_js, flags=re.DOTALL)
    with open(app_path, "w", encoding="utf-8") as f:
        f.write(app_js_new)
        
    print("Patched generate_comic_html.py and app.js")

if __name__ == "__main__":
    main()
