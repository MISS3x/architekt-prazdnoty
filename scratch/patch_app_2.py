import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    app_js_path = os.path.join(base_dir, "app.js")

    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # 1. Remove the hiding logic for textBgVideoContainer
    # We will just replace it with an empty string or comment it out
    bad_code = """
    if (textBgVideoContainer) {
      if (state.comicMode || state.fullscreenMode) {
        textBgVideoContainer.style.display = "none";
      } else {
        textBgVideoContainer.style.display = "block";
      }
    }
    """
    if bad_code in js:
        js = js.replace(bad_code, "")
    else:
        # try regex or more robust replacement if spacing differs
        import re
        js = re.sub(r'if \(textBgVideoContainer\) \{\s*if \(state\.comicMode \|\| state\.fullscreenMode\) \{\s*textBgVideoContainer\.style\.display = "none";\s*\} else \{\s*textBgVideoContainer\.style\.display = "block";\s*\}\s*\}', '', js)

    # 2. Add teaser video src update in setPart
    # Look for: if (fullscreenPoster) fullscreenPoster.classList.add("active");
    target_code = 'if (fullscreenPoster) fullscreenPoster.classList.add("active");'
    patch_code = """if (fullscreenPoster) fullscreenPoster.classList.add("active");
    
    // Update teaser video
    const teaserVid = document.getElementById("fullscreen-teaser-video");
    if (teaserVid) {
      teaserVid.src = `video/teaser_${partNum}.mp4`;
      teaserVid.play().catch(e => console.log("Teaser autoplay prevented", e));
    }
    """
    if target_code in js and "teaserVid.src" not in js:
        js = js.replace(target_code, patch_code)

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

    print("app.js successfully patched again.")

if __name__ == "__main__":
    main()
