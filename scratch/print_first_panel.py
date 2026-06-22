import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    start = html.find('class="comic-panel')
    with open("scratch/panel_out.txt", "w", encoding="utf-8") as out:
        out.write(html[start-20:start+300])

if __name__ == "__main__":
    main()
