import os
import re

def split_into_sentences(text):
    # Regex to split Czech sentences, keeping punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def clean_html_tags(text):
    return re.sub(r'<[^>]+>', '', text).strip()

def extract_quotes(text):
    # Match czech quotes like „something“ or standard quotes
    quotes = re.findall(r'[„"\']([^“"\'?]+)[“"\'?]', text)
    return [q.strip() for q in quotes if q.strip()]

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    screenshots_dir = os.path.join(base_dir, "img", "screenshots")

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find all paragraph blocks of Part 1, Part 2 and Part 3
    pattern = r'<(p|blockquote|div) data-i="(\d+)"[^>]*>(.*?)</\1>'
    matches = re.findall(pattern, html, re.DOTALL)
    print(f"Found {len(matches)} paragraph items in index.html.")

    part1_panels_html = ""
    part2_panels_html = ""
    part3_panels_html = ""

    # Sizes to cycle through to create Marvel layout
    sizes = ["panel-normal", "panel-wide", "panel-normal", "panel-tall", "panel-large", "panel-normal"]

    global_panel_idx = 0

    for tag, idx_str, content in matches:
        idx = int(idx_str)
        
        # Decide part and relative index
        if idx < 20:
            part = 1
            rel_idx = idx
        elif idx < 32:
            part = 2
            rel_idx = idx - 20
        else:
            part = 3
            rel_idx = idx - 32
            
        para_num = rel_idx + 1
        part_str = f"{part:02d}"
        para_str = f"{para_num:02d}"

        # Clean content and extract quotes
        clean_text_full = clean_html_tags(content)
        sentences = split_into_sentences(content)

        # Get existing screenshots
        prefix = f"{part_str}_{para_str}_"
        existing_shots = []
        if os.path.exists(screenshots_dir):
            existing_shots = [f for f in os.listdir(screenshots_dir) if f.startswith(prefix) and f.endswith((".jpg", ".png"))]
            existing_shots.sort()

        # Build panel for each sentence
        for s_idx, s in enumerate(sentences):
            s_clean = clean_html_tags(s)
            s_quotes = extract_quotes(s)

            # Determine image path
            img_src = ""
            if part == 1:
                # Custom check for paragraph 1 sentence 2 (which we generated custom)
                if para_num == 1 and s_idx == 1:
                    img_src = "img/screenshots/01_01_02_custom.png"
                elif s_idx < len(existing_shots):
                    img_src = f"img/screenshots/{existing_shots[s_idx]}"
                elif len(existing_shots) > 0:
                    img_src = f"img/screenshots/{existing_shots[0]}"
                else:
                    img_src = "img/screenshots/01_01_01.jpg" # Fallback
            elif part == 2:
                if para_num <= 12:
                    if s_idx < len(existing_shots):
                        img_src = f"img/screenshots/{existing_shots[s_idx]}"
                    elif len(existing_shots) > 0:
                        img_src = f"img/screenshots/{existing_shots[0]}"
                    else:
                        img_src = "img/screenshots/02_01_01.jpg" # Fallback
                else:
                    # Missing video paragraphs 13 to 27 (custom generated)
                    img_src = f"img/screenshots/02_{para_str}_custom.png"
            else:
                # Part 3
                if s_idx < len(existing_shots):
                    img_src = f"img/screenshots/{existing_shots[s_idx]}"
                elif len(existing_shots) > 0:
                    img_src = f"img/screenshots/{existing_shots[0]}"
                else:
                    img_src = "img/screenshots/03_01_01.jpg" # Fallback

            # Layout size class
            size_class = sizes[global_panel_idx % len(sizes)]
            global_panel_idx += 1

            panel_html = f"""
          <div class="comic-panel {size_class}" data-i="{idx}" data-sentence="{s_idx}">
            <img src="{img_src}" alt="Díl {part}, Odst. {para_num}, Věta {s_idx+1}" class="comic-panel-img" loading="lazy">
            <div class="comic-panel-overlay"></div>
            <div class="comic-panel-border"></div>
            <div class="comic-panel-number">#{idx}.{s_idx}</div>
"""
            # Render bubble for EVERY panel as requested
            panel_html += f"""
            <div class="speech-bubble">
              <span class="speech-text">{s_clean}</span>
              <div class="speech-pointer"></div>
            </div>"""


            panel_html += """
          </div>"""

            if part == 1:
                part1_panels_html += panel_html
            elif part == 2:
                part2_panels_html += panel_html
            else:
                part3_panels_html += panel_html

    # Clean existing comic grids from HTML to prevent duplication
    html = re.sub(r'<!-- Comic Grid Part \d+ -->.*?<!-- End Comic Grid Part \d+ -->', '', html, flags=re.DOTALL)
    html = re.sub(r'<div class="comic-content hidden" id="comic-content-part\d+">.*?<!-- End Comic Grid Part \d+ -->', '', html, flags=re.DOTALL)
    html = re.sub(r'<div class="comic-content hidden" id="comic-content-part\d+">.*?</div>\s*</div>', '', html, flags=re.DOTALL)

    comic_structure_part1 = f"""
      <!-- Comic Grid Part 1 -->
      <div class="comic-content hidden" id="comic-content-part1">
        <div class="comic-grid">
          {part1_panels_html}
        </div>
      </div>
      <!-- End Comic Grid Part 1 -->
"""

    comic_structure_part2 = f"""
      <!-- Comic Grid Part 2 -->
      <div class="comic-content hidden" id="comic-content-part2">
        <div class="comic-grid">
          {part2_panels_html}
        </div>
      </div>
      <!-- End Comic Grid Part 2 -->
"""

    comic_structure_part3 = f"""
      <!-- Comic Grid Part 3 -->
      <div class="comic-content hidden" id="comic-content-part3">
        <div class="comic-grid">
          {part3_panels_html}
        </div>
      </div>
      <!-- End Comic Grid Part 3 -->
"""

    # Inject Comic structures back into the main story containers
    # Insert part 1
    part1_end = "</div> <!-- End #story-content-part1 -->"
    if part1_end in html:
        html = html.replace(part1_end, part1_end + comic_structure_part1)
        print("Inserted Comic Part 1.")
    else:
        html = html.replace('id="story-content-part1">', 'id="story-content-part1">\n' + comic_structure_part1)

    # Insert part 2
    part2_end_pattern = r'(</div>\s*</div>\s*<!-- Part 3 -->)'
    if re.search(part2_end_pattern, html):
        html = re.sub(part2_end_pattern, r'</div>\n      </div>\n' + comic_structure_part2 + '\n      <!-- Part 3 -->', html)
        print("Inserted Comic Part 2.")

    # Insert part 3
    part3_end_pattern = r'(</div>\s*</div>\s*</main>)'
    if re.search(part3_end_pattern, html):
        html = re.sub(part3_end_pattern, r'</div>\n      </div>\n' + comic_structure_part3 + '\n      </main>', html)
        print("Inserted Comic Part 3.")
    else:
        # Fallback if patterns differ
        html = html.replace("</main>", comic_structure_part3 + "\n    </main>")
        print("Inserted Comic Part 3 (fallback).")

    # Inject the Text/Comic switcher buttons into the HTML if they do not exist
    if "player-mode-selector" not in html:
        tab_row_pattern = r'(<div class="player-parts-tabs">)'
        switcher_html = """
            <div class="player-mode-selector">
              <button id="btn-mode-text" class="mode-btn active">// TEXTOVÁ VERZE</button>
              <button id="btn-mode-comic" class="mode-btn">// KOMIKSOVÁ VERZE</button>
              <button id="btn-mode-movie" class="mode-btn">// FILMOVÁ VERZE</button>
            </div>
            
            \\1"""
        html = re.sub(tab_row_pattern, switcher_html, html)
        print("Inserted player mode switcher buttons.")

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("Comic HTML injected successfully into index.html.")

if __name__ == "__main__":
    main()
