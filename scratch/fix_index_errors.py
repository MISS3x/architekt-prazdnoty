import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Fix audio src
    html = html.replace('src="audio/pribeh.mp3"', 'src="audio/dil_1.mp3"')

    # Fix favicon if not already present
    if 'rel="icon"' not in html:
        # Insert after <title>
        html = html.replace('<title>ARCHITEKT PRÁZDNOTY</title>', '<title>ARCHITEKT PRÁZDNOTY</title>\n  <link rel="icon" href="avatar/ruda/ruda.png" type="image/png">')

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)

if __name__ == "__main__":
    main()
