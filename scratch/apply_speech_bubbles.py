import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find all <div class="comic-caption"><p>TEXT</p></div>
    # and replace with:
    # <div class="speech-bubble">
    #   <div class="speech-text">TEXT</div>
    #   <div class="speech-pointer"></div>
    # </div>
    
    pattern = r'<div class="comic-caption">\s*<p>(.*?)</p>\s*</div>'
    replacement = r'''<div class="speech-bubble">
              <div class="speech-text">\1</div>
              <div class="speech-pointer"></div>
            </div>'''
            
    new_html = re.sub(pattern, replacement, html, flags=re.DOTALL)
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_html)
        
    print(f"Replaced {html.count('comic-caption')} comic-captions with speech-bubbles.")

if __name__ == "__main__":
    main()
