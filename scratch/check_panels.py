import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find first panel of part 2
    match = re.search(r'(<div class="comic-panel[^>]*data-i="0" data-sentence="0"[^>]*>.*?</div>\s*</div>)', html[html.find('comic-content-part2'):], re.DOTALL)
    with open("scratch/panel_out.txt", "w", encoding="utf-8") as f:
        if match:
            f.write(match.group(1))
        else:
            f.write("Not found")

if __name__ == "__main__":
    main()
