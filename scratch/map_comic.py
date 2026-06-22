import os
import re

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

    # Match all paragraphs/quotes in index.html with data-i
    pattern = r'<(p|blockquote|div) data-i="(\d+)"[^>]*>(.*?)</\1>'
    matches = re.findall(pattern, html, re.DOTALL)

    output_path = os.path.join(base_dir, "scratch", "comic_mapping_report.txt")
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("COMIC MAPPING REPORT\n====================\n\n")

        for tag, idx_str, content in matches:
            idx = int(idx_str)
            part = 1 if idx < 20 else 2
            rel_idx = idx if part == 1 else idx - 20
            para_num = rel_idx + 1

            part_str = f"{part:02d}"
            para_str = f"{para_num:02d}"

            # Split content into sentences
            raw_text = clean_html_tags(content)
            sentences = split_into_sentences(raw_text)

            # Find existing screenshots for this paragraph
            prefix = f"{part_str}_{para_str}_"
            existing_shots = []
            if os.path.exists(screenshots_dir):
                existing_shots = [f for f in os.listdir(screenshots_dir) if f.startswith(prefix) and f.endswith(".jpg")]
                existing_shots.sort()

            out.write(f"Part {part}, Paragraph {para_num} (data-i={idx}):\n")
            out.write(f"  Sentences ({len(sentences)}):\n")
            for s_idx, s in enumerate(sentences):
                out.write(f"    [{s_idx+1}] {s}\n")
            out.write(f"  Screenshots ({len(existing_shots)}): {existing_shots}\n")
            
            # Map sentences to screenshots
            for s_idx, s in enumerate(sentences):
                if s_idx < len(existing_shots):
                    out.write(f"    -> Sentence {s_idx+1} maps to: {existing_shots[s_idx]}\n")
                else:
                    out.write(f"    -> Sentence {s_idx+1} is MISSING an image!\n")
            out.write("\n")

    print("Mapping report generated at scratch/comic_mapping_report.txt")

if __name__ == "__main__":
    main()
