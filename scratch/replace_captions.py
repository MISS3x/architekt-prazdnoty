import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # The structure to replace is:
    # <div class="comic-caption">
    #   <p>Text...</p>
    # </div>
    # With:
    # <div class="speech-bubble">
    #   <div class="speech-tail"></div>
    #   <p>Text...</p>
    # </div>

    # Regex to match comic-caption and replace with speech-bubble
    pattern = r'<div class="comic-caption">(.*?)</div>'
    
    def replacer(match):
        inner_html = match.group(1)
        return f'<div class="speech-bubble">\n              <div class="speech-tail"></div>{inner_html}</div>'

    new_html = re.sub(pattern, replacer, html, flags=re.DOTALL)

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"Replaced {html.count('class=\"comic-caption\"')} occurrences.")

if __name__ == "__main__":
    main()
