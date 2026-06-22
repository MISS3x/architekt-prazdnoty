import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    app_js_path = os.path.join(base_dir, "app.js")

    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Replace unguarded classList.add calls for tabPart
    js = js.replace('tabPart1.classList.add("active");', 'if (tabPart1) tabPart1.classList.add("active");')
    js = js.replace('tabPart2.classList.add("active", "part2-active");', 'if (tabPart2) tabPart2.classList.add("active", "part2-active");')
    js = js.replace('tabPart3.classList.add("active", "part3-active");', 'if (tabPart3) tabPart3.classList.add("active", "part3-active");')

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

if __name__ == "__main__":
    main()
