import os
import re

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    screenshots_dir = os.path.join(base_dir, "img", "screenshots")

    # Get list of screenshot files
    if os.path.exists(screenshots_dir):
        screenshots = [f for f in os.listdir(screenshots_dir) if f.endswith(".jpg")]
        screenshots.sort()
    else:
        screenshots = []
    
    print(f"Loaded {len(screenshots)} screenshots.")

    # Read index.html
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Replace existing placeholders in Part 1
    # img/a.jpg -> img/screenshots/01_01_01.jpg
    html = html.replace('src="img/a.jpg"', 'src="img/screenshots/01_01_01.jpg"')
    # img/b.jpg -> img/screenshots/01_03_01.jpg
    html = html.replace('src="img/b.jpg"', 'src="img/screenshots/01_03_01.jpg"')
    # video/dil_1/01_16_01.mp4 -> img/screenshots/01_16_01.jpg (tag should be <img>, not <video>)
    video_tag_16 = '<video src="video/dil_1/01_16_01.mp4" autoplay loop muted playsinline class="story-img img-circle-amber"></video>'
    img_tag_16 = '<img src="img/screenshots/01_16_01.jpg" alt="A v ten moment..." class="story-img img-circle-amber">'
    html = html.replace(video_tag_16, img_tag_16)

    # video/dil_1/01_15_01.mp4 -> img/screenshots/01_15_01.jpg (tag should be <img>, not <video>)
    video_tag_15 = '<video src="video/dil_1/01_15_01.mp4" autoplay loop muted playsinline class="story-img img-circle-amber"></video>'
    img_tag_15 = '<img src="img/screenshots/01_15_01.jpg" alt="Nejdivnejsi nalez" class="story-img img-circle-amber">'
    html = html.replace(video_tag_15, img_tag_15)

    # img/lahev.jpg -> img/screenshots/01_20_01.jpg
    html = html.replace('src="img/lahev.jpg"', 'src="img/screenshots/01_20_01.jpg"')

    # 2. Replace existing placeholders in Part 2
    # video/dil_2/02_02_02.mp4 -> img/screenshots/02_02_02.jpg
    video_tag_02_02 = '<video src="video/dil_2/02_02_02.mp4" autoplay loop muted playsinline class="story-img img-circle-amber"></video>'
    img_tag_02_02 = '<img src="img/screenshots/02_02_02.jpg" alt="AEGIS UNDER SYSTEM CRISIS" class="story-img img-circle-amber">'
    html = html.replace(video_tag_02_02, img_tag_02_02)

    # 3. Add more illustrations into Part 1 text flow at logical places
    # We will insert new figures after paragraph 5, 9, 12.
    fig_p5 = """
        <!-- Illustration C - Ruda in the mountains -->
        <figure class="story-figure">
          <img src="img/screenshots/01_06_01.jpg" alt="Ruda Müller v kontaminovaných horách" class="story-img img-circle">
          <figcaption class="story-figcaption">RUDA MÜLLER — ZERO SYNC POINT</figcaption>
        </figure>
"""
    # Insert after paragraph 5 (index 5)
    p5_str = 'Celý tento odstavec a další pasáže jsou skvělé...'
    # Let's match Paragraph 5 end: </p>\n\n        <!-- Paragraph 6 -->'
    html = html.replace('<!-- Paragraph 5 -->\n        <blockquote data-i="4" class="story-quote">\n          „Odpojuji neuro-link. Lokální vyhledávání vypnuto. Spouštím autonomní režim,“ oznámil chladný hlas v jeho hlavě.\n        </blockquote>\n\n        <!-- Paragraph 5 -->', '<!-- Paragraph 4 -->\n        <blockquote data-i="4" class="story-quote">\n          „Odpojuji neuro-link. Lokální vyhledávání vypnuto. Spouštím autonomní režim,“ oznámil chladný hlas v jeho hlavě.\n        </blockquote>\n\n        <!-- Paragraph 5 -->')
    
    # Let's do regex insertions for safety
    # Insert after p5
    p5_end_pattern = r'(<p data-i="5" class="story-paragraph">.*?</p>)'
    if re.search(p5_end_pattern, html, re.DOTALL):
        html = re.sub(p5_end_pattern, r'\1' + fig_p5, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p5.")

    # Insert after p9
    fig_p9 = """
        <!-- Illustration G - Aegis control room -->
        <figure class="story-figure">
          <img src="img/screenshots/01_10_01.jpg" alt="Analýza včelího kódu v Aegis" class="story-img img-circle">
          <figcaption class="story-figcaption">AEGIS CORE INTERFACE</figcaption>
        </figure>
"""
    p9_end_pattern = r'(<p data-i="9" class="story-paragraph">.*?</p>)'
    if re.search(p9_end_pattern, html, re.DOTALL):
        html = re.sub(p9_end_pattern, r'\1' + fig_p9, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p9.")

    # Insert after p12
    fig_p12 = """
        <!-- Illustration H - Medical Clinic -->
        <figure class="story-figure">
          <img src="img/screenshots/01_13_01.jpg" alt="Müllerova mechatronická klinika" class="story-img img-circle">
          <figcaption class="story-figcaption">NEURO-RECOVERY WARD</figcaption>
        </figure>
"""
    p12_end_pattern = r'(<p data-i="12" class="story-paragraph">.*?</p>)'
    if re.search(p12_end_pattern, html, re.DOTALL):
        html = re.sub(p12_end_pattern, r'\1' + fig_p12, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p12.")

    # 4. Add more illustrations into Part 2 text flow
    # We will insert new figures after paragraph 25, 27, 29, 31
    fig_p25 = """
          <figure class="story-figure">
            <img src="img/screenshots/02_06_01.jpg" alt="Glitche a neuro-link" class="story-img img-circle-amber">
            <figcaption class="story-figcaption">NEURO-FEED ERROR TRANSMISSION</figcaption>
          </figure>
"""
    p25_end_pattern = r'(<p data-i="25" class="story-paragraph">.*?</p>)'
    if re.search(p25_end_pattern, html, re.DOTALL):
        html = re.sub(p25_end_pattern, r'\1' + fig_p25, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p25.")

    fig_p27 = """
          <figure class="story-figure">
            <img src="img/screenshots/02_08_01.jpg" alt="Sršni pronásledují Miu" class="story-img img-circle-amber">
            <figcaption class="story-figcaption">TACTICAL INTERCEPTION IN STOCKS</figcaption>
          </figure>
"""
    p27_end_pattern = r'(<p data-i="27" class="story-paragraph">.*?</p>)'
    if re.search(p27_end_pattern, html, re.DOTALL):
        html = re.sub(p27_end_pattern, r'\1' + fig_p27, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p27.")

    fig_p29 = """
          <figure class="story-figure">
            <img src="img/screenshots/02_10_01.jpg" alt="Krtek a jeho kybernetické čočky" class="story-img img-circle-amber">
            <figcaption class="story-figcaption">KRTEK — THE ANOMALY ARCHIVIST</figcaption>
          </figure>
"""
    p29_end_pattern = r'(<p data-i="29" class="story-paragraph">.*?</p>)'
    if re.search(p29_end_pattern, html, re.DOTALL):
        html = re.sub(p29_end_pattern, r'\1' + fig_p29, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p29.")

    fig_p31 = """
          <figure class="story-figure">
            <img src="img/screenshots/02_12_01.jpg" alt="Příprava na cestu do hor" class="story-img img-circle-amber">
            <figcaption class="story-figcaption">PREPARING FOR EXCLUSION ZONE</figcaption>
          </figure>
"""
    p31_end_pattern = r'(<p data-i="31" class="story-paragraph">.*?</p>)'
    if re.search(p31_end_pattern, html, re.DOTALL):
        html = re.sub(p31_end_pattern, r'\1' + fig_p31, html, count=1, flags=re.DOTALL)
        print("Inserted fig_p31.")

    # 5. Generate Gallery HTML
    gallery_items_html = ""
    for shot in screenshots:
        part = "1" if shot.startswith("01_") else "2"
        shot_id = os.path.splitext(shot)[0]
        # Clean label (e.g. 01_05_01 -> Part 1, Paragraph 5, Shot 1)
        parts = shot_id.split("_")
        label = f"Díl {int(parts[0])} · Odst. {int(parts[1])} · Snímek {int(parts[2])}"

        gallery_items_html += f"""
        <div class="gallery-card" data-part="{part}" data-src="img/screenshots/{shot}">
          <div class="gallery-img-wrapper">
            <img src="img/screenshots/{shot}" alt="{label}" loading="lazy">
            <div class="gallery-card-glow"></div>
          </div>
          <div class="gallery-card-info">
            <div class="gallery-card-id">[{shot_id}]</div>
            <div class="gallery-card-label">{label}</div>
          </div>
        </div>"""

    gallery_section_html = f"""
    <!-- Gallery Section -->
    <section class="gallery-section">
      <div class="gallery-header">
        <h2 class="gallery-title">// DATOVÝ ARCHIV — VIZUÁLNÍ GALERIE</h2>
        <div class="gallery-filters">
          <button class="gallery-filter-btn active" data-filter="all">VŠE</button>
          <button class="gallery-filter-btn" data-filter="1">DÍL I</button>
          <button class="gallery-filter-btn" data-filter="2">DÍL II</button>
        </div>
      </div>
      <div class="gallery-grid">
        {gallery_items_html}
      </div>
    </section>

    </main>
"""
    # Replace the closing </main> with our gallery section and the closing </main>
    html = html.replace("</main>", gallery_section_html)

    # 6. Save modified index.html
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("index.html updated successfully with inline screenshots and visual gallery.")

if __name__ == "__main__":
    main()
