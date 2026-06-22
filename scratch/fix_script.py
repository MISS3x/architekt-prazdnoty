import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    gen_path = os.path.join(base_dir, "scratch", "generate_comic_html.py")
    with open(gen_path, "r", encoding="utf-8") as f:
        gen_py = f.read()
    
    # Remove the dangling else block
    pattern = r'            else:\n                panel_html \+= f"""\n            <div class="comic-caption">\n              <p>\{s_clean\}</p>\n            </div>"""'
    gen_py_new = re.sub(pattern, '', gen_py, flags=re.DOTALL)
    
    with open(gen_path, "w", encoding="utf-8") as f:
        f.write(gen_py_new)
        
    print("Fixed generate_comic_html.py")

if __name__ == "__main__":
    main()
