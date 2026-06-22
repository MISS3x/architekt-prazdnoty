import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    panels = html.split('class="comic-panel')
    panels = panels[1:] # discard everything before first panel
    
    num_bubbles = sum(1 for p in panels if 'speech-bubble' in p)
    num_captions = sum(1 for p in panels if 'comic-caption' in p)
    
    print(f'Total panels: {len(panels)}, with bubbles: {num_bubbles}, with captions: {num_captions}')

if __name__ == "__main__":
    main()
