import os

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    
    # 1. Update index.html
    index_path = os.path.join(base_dir, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    if 'id="hero-video-source"' not in html:
        html = html.replace('<source src="video/hero.mp4" type="video/mp4">', '<source src="video/hero.mp4" id="hero-video-source" type="video/mp4">')
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(html)

    # 2. Update app.js
    app_js_path = os.path.join(base_dir, "app.js")
    with open(app_js_path, "r", encoding="utf-8") as f:
        js = f.read()

    get_video_path_code = """
  const IS_MOBILE = window.innerWidth <= 768;
  const getVideoPath = (path) => {
    if (!path || typeof path !== 'string') return path;
    if (IS_MOBILE && path.includes('.mp4') && !path.includes('_mobile.mp4')) {
      return path.replace('.mp4', '_mobile.mp4');
    }
    return path;
  };
  
  // Set hero video src dynamically for mobile
  const heroVideoSource = document.getElementById("hero-video-source");
  if (heroVideoSource) {
    heroVideoSource.src = getVideoPath("video/hero.mp4");
    if (heroVideoSource.parentElement) heroVideoSource.parentElement.load();
  }
"""

    if "const getVideoPath" not in js:
        # Insert after DOMContentLoaded
        target = 'document.addEventListener("DOMContentLoaded", () => {'
        js = js.replace(target, target + '\n' + get_video_path_code)

    # Replacements
    replacements = {
        'teaserVid.src = `video/teaser_${partNum}.mp4`;': 'teaserVid.src = getVideoPath(`video/teaser_${partNum}.mp4`);',
        'videoEl.src = src;': 'videoEl.src = getVideoPath(src);',
        'nextFsEl.src = src;': 'nextFsEl.src = getVideoPath(src);',
        'nextPrevEl.src = src;': 'nextPrevEl.src = getVideoPath(src);',
        'nextVideoEl.src = src;': 'nextVideoEl.src = getVideoPath(src);',
        'videoEl.src = currentVideoEl.src;': 'videoEl.src = getVideoPath(currentVideoEl.src);'
    }

    for old, new in replacements.items():
        js = js.replace(old, new)

    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(js)

if __name__ == "__main__":
    main()
