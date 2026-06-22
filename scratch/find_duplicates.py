import os
import re
import sys

# Reconfigure stdout to use UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def split_into_sentences(text):
    # Regex to split Czech sentences, keeping punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def clean_html_tags(text):
    return re.sub(r'<[^>]+>', '', text).strip()

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index.html")
    screenshots_dir = os.path.join(base_dir, "img", "screenshots")

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find all paragraph blocks of Part 1, Part 2 and Part 3
    pattern = r'<(p|blockquote|div) data-i="(\d+)"[^>]*>(.*?)</\1>'
    matches = re.findall(pattern, html, re.DOTALL)
    
    needed_generations = []

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

        # Clean content
        clean_text_full = clean_html_tags(content)
        sentences = split_into_sentences(content)

        # Get existing screenshots
        prefix = f"{part_str}_{para_str}_"
        existing_shots = []
        if os.path.exists(screenshots_dir):
            existing_shots = [f for f in os.listdir(screenshots_dir) if f.startswith(prefix) and f.endswith((".jpg", ".png"))]
            existing_shots.sort()

        # Check each sentence
        for s_idx, s in enumerate(sentences):
            s_clean = clean_html_tags(s)
            
            # Is it a duplicate or fallback?
            is_fallback = False
            reason = ""
            
            if part == 1:
                if para_num == 1 and s_idx == 1:
                    # Already custom generated
                    img_name = "01_01_02_custom.png"
                elif s_idx < len(existing_shots):
                    img_name = existing_shots[s_idx]
                else:
                    is_fallback = True
                    reason = f"only {len(existing_shots)} shots for {len(sentences)} sentences"
                    img_name = f"01_{para_str}_{s_idx+1:02d}_gen.png"
            elif part == 2:
                if para_num <= 12:
                    if s_idx < len(existing_shots):
                        img_name = existing_shots[s_idx]
                    else:
                        is_fallback = True
                        reason = f"only {len(existing_shots)} shots for {len(sentences)} sentences"
                        img_name = f"02_{para_str}_{s_idx+1:02d}_gen.png"
                else:
                    # Paragraphs 13 to 27 are already custom generated
                    img_name = f"02_{para_str}_custom.png"
            else:
                # Part 3
                if s_idx < len(existing_shots):
                    img_name = existing_shots[s_idx]
                else:
                    is_fallback = True
                    reason = f"only {len(existing_shots)} shots for {len(sentences)} sentences"
                    img_name = f"03_{para_str}_{s_idx+1:02d}_gen.png"
            
            if is_fallback:
                needed_generations.append({
                    "part": part,
                    "para_num": para_num,
                    "s_idx": s_idx,
                    "text": s_clean,
                    "target_name": img_name,
                    "reason": reason
                })

    print(f"Total needed unique generated images: {len(needed_generations)}")
    for item in needed_generations[:15]:
        print(f"Part {item['part']} P{item['para_num']} S{item['s_idx']+1}: {item['target_name']}")
        print(f"  Text: {item['text']}")
        print()

if __name__ == "__main__":
    main()
