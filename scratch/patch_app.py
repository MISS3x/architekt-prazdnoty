import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    app_js_path = os.path.join(base_dir, "app.js")

    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # 1. Update time-duration to time-total
    js = js.replace('getElementById("time-duration")', 'getElementById("time-total")')
    
    # 2. Add textBgVideoContainer reference
    if "textBgVideoContainer" not in js:
        js = js.replace('const bgContainer = document.getElementById("bg-container");',
                        'const textBgVideoContainer = document.querySelector(".text-bg-video-container");\n  const bgContainer = document.getElementById("bg-container");')

    # 3. Add textBgVideoContainer toggling in updateModeVisibility
    update_visibility_target = 'if (state.comicMode) {'
    if "textBgVideoContainer.style.display" not in js:
        visibility_patch = """
    if (textBgVideoContainer) {
      if (state.comicMode || state.fullscreenMode) {
        textBgVideoContainer.style.display = "none";
      } else {
        textBgVideoContainer.style.display = "block";
      }
    }
    
    if (state.comicMode) {"""
        js = js.replace(update_visibility_target, visibility_patch, 1)

    # 4. Add btnGallery listener in setupUIListeners
    ui_listeners_target = 'const setupUIListeners = () => {'
    if "btn-nav-gallery" not in js:
        gallery_patch = """const setupUIListeners = () => {
    const btnGallery = document.getElementById("btn-nav-gallery");
    if (btnGallery) {
      btnGallery.addEventListener("click", () => {
        const gallery = document.querySelector(".gallery-section");
        if (gallery) gallery.scrollIntoView({ behavior: "smooth" });
      });
    }"""
        js = js.replace(ui_listeners_target, gallery_patch, 1)

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

    print("app.js successfully patched.")

if __name__ == "__main__":
    main()
