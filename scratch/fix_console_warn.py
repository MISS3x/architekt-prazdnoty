import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    app_js_path = os.path.join(base_dir, "app.js")

    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    js = js.replace('.catch(err => console.warn("Fullscreen video mirror play failed:", err.message));', 
                    '.catch(err => {}); // Ignored intentionally to prevent console spam from browser power-saving')

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

if __name__ == "__main__":
    main()
