import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
index_path = os.path.join(base_dir, "index.html")

with open(index_path, "r", encoding="utf-8") as f:
    html = f.read()

# Parse paragraphs to map data-i -> text
paragraph_regex = re.compile(r'<(p|blockquote|div)\s+data-i="(\d+)"[^>]*>(.*?)</\1>', re.DOTALL)
paragraphs = {}
for match in paragraph_regex.finditer(html):
    i = int(match.group(2))
    text_raw = match.group(3)
    text_clean = re.sub(r'<[^>]+>', '', text_raw)
    text_clean = " ".join(text_clean.split()).strip()
    paragraphs[i] = text_clean

# Test the new regex
panel_regex = re.compile(r'<div\s+class="comic-panel(?:\s+[^"]*)?"([^>]*?)>.*?<img\s+src="([^"]+)"', re.DOTALL)

matches = list(panel_regex.finditer(html))
print(f"Total matches found: {len(matches)}")

missing_count = 0
for idx, match in enumerate(matches):
    attrs = match.group(1)
    img_src = match.group(2)
    
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
        print(f"Match #{idx} missing text: {os.path.basename(img_src)}")
        print(f"  attrs: {repr(attrs)}")
        print(f"  global_i: {global_i}, sentence_idx: {sentence_idx}")

print(f"Summary: {missing_count} panels missing text out of {len(matches)} matches.")
