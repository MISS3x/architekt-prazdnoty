import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    print("Count of 'comic-panel':", html.count('class="comic-panel'))
    print("Count of 'comic-panel-number':", html.count('class="comic-panel-number"'))
    print("Count of 'speech-bubble':", html.count('class="speech-bubble"'))

if __name__ == "__main__":
    main()
