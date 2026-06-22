import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Cue arrays from app.js
PART1_CUES = [
    6.40, 29.00, 62.00, 78.00, 86.00, 95.00, 119.00, 162.00, 175.00, 200.00,
    207.00, 220.00, 229.00, 247.00, 265.00, 279.00, 295.00, 324.00, 353.00, 376.00
]
PART2_CUES = [
    10.0, 39.0, 64.0, 106.0, 130.0, 150.0, 163.0, 185.0, 224.0, 257.0, 293.0, 301.0
]
PART3_CUES = [
    10.34, 47.64, 86.44, 126.94, 146.04, 182.24, 217.34, 247.94, 259.54, 265.14, 298.04, 319.44, 347.64, 372.94, 402.44
]

PART_DURATIONS = {
    1: 382.275875,
    2: 347.010563,
    3: 412.682438
}

CUES_MAP = {
    1: PART1_CUES,
    2: PART2_CUES,
    3: PART3_CUES
}

SENTENCE_END = re.compile(r'[.!?]["\')\]]*$')

def calculate_sentence_duration(part, global_i, sentence_idx):
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    index_path = os.path.join(base_dir, "index_v2.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find the paragraph text
    paragraph_regex = re.compile(r'<(p|blockquote|div)\s+data-i="(\d+)"[^>]*>(.*?)</\1>', re.DOTALL)
    para_text = ""
    for match in paragraph_regex.finditer(html):
        if int(match.group(2)) == global_i:
            para_text = match.group(3)
            para_text = re.sub(r'<[^>]+>', '', para_text)
            para_text = " ".join(para_text.split()).strip()
            break

    if not para_text:
        print(f"Paragraph {global_i} not found!")
        return 4.0 # default fallback

    # Cues
    cues = CUES_MAP.get(part, PART1_CUES)
    total_dur = PART_DURATIONS.get(part, 382.275875)
    
    t_start = cues[global_i]
    t_end = cues[global_i + 1] if (global_i < len(cues) - 1) else total_dur
    span = max(0.1, t_end - t_start)
    
    # Split to words
    words = [w.strip() for w in para_text.split() if w.strip()]
    wc = len(words)
    
    # Build sentence boundary times
    sentence_boundaries = [t_start]
    for w_idx in range(wc - 1):
        word = words[w_idx]
        if SENTENCE_END.search(word):
            boundary = t_start + ((w_idx + 1) / wc) * span
            sentence_boundaries.append(boundary)
    sentence_boundaries.append(t_end)
    sentence_boundaries = sorted(list(set(sentence_boundaries)))
    
    print(f"Paragraph word count: {wc}")
    print(f"Sentence boundaries: {[round(x, 2) for x in sentence_boundaries]}")
    
    if sentence_idx < len(sentence_boundaries) - 1:
        s_start = sentence_boundaries[sentence_idx]
        s_end = sentence_boundaries[sentence_idx + 1]
        s_dur = s_end - s_start
        print(f"Sentence {sentence_idx}: starts at {round(s_start, 2)}s, ends at {round(s_end, 2)}s, duration: {round(s_dur, 2)}s")
        return s_dur
    else:
        print(f"Sentence index {sentence_idx} out of boundaries (len={len(sentence_boundaries)-1})")
        return 4.0

if __name__ == "__main__":
    calculate_sentence_duration(1, 0, 0)
    calculate_sentence_duration(1, 0, 1)
