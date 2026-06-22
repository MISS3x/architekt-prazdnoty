import os
import re

def parse_html_panels(html_path):
    print(f"\nParsing: {html_path}")
    if not os.path.exists(html_path):
        print("File does not exist")
        return

    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse paragraphs to map data-i -> text
    paragraph_regex = re.compile(r'<(p|blockquote|div)\s+data-i="(\d+)"[^>]*>(.*?)</\1>', re.DOTALL)
    paragraphs = {}
    for match in paragraph_regex.finditer(content):
        tag = match.group(1)
        i = int(match.group(2))
        text_raw = match.group(3)
        # remove HTML tags and clean up whitespace
        text_clean = re.sub(r'<[^>]+>', '', text_raw)
        text_clean = " ".join(text_clean.split()).strip()
        paragraphs[i] = text_clean

    # Parse panels
    panel_regex = re.compile(r'<div\s+class="comic-panel[^"]*"([^>]*?)>.*?<img\s+src="([^"]+)"', re.DOTALL)
    
    missing_count = 0
    total_count = 0
    for match in panel_regex.finditer(content):
        attrs = match.group(1)
        img_src = match.group(2)
        total_count += 1
        
        i_match = re.search(r'data-i="(\d+)"', attrs)
        global_i = int(i_match.group(1)) if i_match else -1
        
        s_match = re.search(r'data-sentence="(\d+)"', attrs)
        sentence_idx = int(s_match.group(1)) if s_match else -1
        
        para_text = paragraphs.get(global_i, "")
        text = ""
        if para_text:
            sentences = re.findall(r'[^.?!]+[.?!]+(?=\s|$)|[^.?!]+', para_text)
            sentences = [s.strip() for s in sentences if s.strip()]
            if sentence_idx < len(sentences):
                text = sentences[sentence_idx]
        
        if not text:
            missing_count += 1
            print(f"Panel: {os.path.basename(img_src)} | data-i={global_i} | data-sentence={sentence_idx} | NO TEXT ASSIGNED!")
            print(f"  Attributes: {attrs.strip()}")
            if global_i in paragraphs:
                print(f"  Paragraph text was found but sentence index {sentence_idx} out of bounds (len={len(sentences)}).")
                print(f"  Paragraph: {para_text}")
            else:
                print(f"  Paragraph with data-i={global_i} was NOT found in the document!")

    print(f"Summary: {missing_count} out of {total_count} panels have no text assigned.")

if __name__ == "__main__":
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    parse_html_panels(os.path.join(base_dir, "index.html"))
    parse_html_panels(os.path.join(base_dir, "index_v2.html"))
