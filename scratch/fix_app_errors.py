import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    app_js_path = os.path.join(base_dir, "app.js")

    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Fix tabPart null reference
    bad_code = """
    // Reset all tabs active states
    tabPart1.classList.remove("active", "part2-active", "part3-active");
    tabPart2.classList.remove("active", "part2-active", "part3-active");
    tabPart3.classList.remove("active", "part2-active", "part3-active");
    """
    good_code = """
    // Reset all tabs active states
    if (tabPart1) tabPart1.classList.remove("active", "part2-active", "part3-active");
    if (tabPart2) tabPart2.classList.remove("active", "part2-active", "part3-active");
    if (tabPart3) tabPart3.classList.remove("active", "part2-active", "part3-active");
    """
    if bad_code in js:
        js = js.replace(bad_code, good_code)

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

if __name__ == "__main__":
    main()
