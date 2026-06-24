import whisper
import json
import re
from bs4 import BeautifulSoup

def get_paragraphs(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    parts = {}
    for i in range(1, 4):
        container = soup.select_one(f"#story-content-part{i}")
        if not container:
            continue
        paras = container.select("p")
        texts = []
        for p in paras:
            text = p.get_text(separator=" ", strip=True)
            text = text.replace("\xa0", " ").replace("\n", " ").strip()
            if text:
                texts.append(text)
        parts[i] = texts
    return parts

def align_robust(segments, paragraphs):
    full_text = ""
    char_to_time = {}
    for seg in segments:
        start_idx = len(full_text)
        text = seg['text'] + " "
        for i in range(len(text)):
            char_to_time[start_idx + i] = seg['start']
        full_text += text
        
    cues = []
    search_start = 0
    
    for p in paragraphs:
        words = [w for w in re.split(r'\W+', p) if w]
        if not words:
            cues.append(0.0)
            continue
            
        found = False
        for prefix_len in [5, 4, 3, 2, 1]:
            if len(words) < prefix_len: continue
            prefix = words[:prefix_len]
            pattern = r'(?i)' + r'\W+'.join(prefix)
            try:
                match = re.search(pattern, full_text[search_start:])
                if match:
                    match_start = search_start + match.start()
                    time = char_to_time.get(match_start, 0.0)
                    cues.append(round(time, 2))
                    search_start = match_start + len(prefix[0])
                    found = True
                    break
            except Exception as e:
                pass
                
        if not found:
            last_time = cues[-1] if cues else 0.0
            cues.append(round(last_time + 1.0, 2))
            
    return cues

def main():
    paragraphs = get_paragraphs("index.html")
    print(f"Extracted paragraphs: Part 1: {len(paragraphs[1])}, Part 2: {len(paragraphs[2])}, Part 3: {len(paragraphs[3])}")
    
    print("Loading whisper model...")
    model = whisper.load_model("base")
    
    results = {}
    for part in [1, 2, 3]:
        audio_file = f"audio/dil_{part}.mp3"
        print(f"Transcribing {audio_file}...")
        result = model.transcribe(audio_file, language="cs", word_timestamps=False)
        
        # Save raw segments for debug
        with open(f"scratch/dil_{part}_segments.json", "w", encoding="utf-8") as f:
            json.dump(result["segments"], f, ensure_ascii=False, indent=2)
            
        cues = align_robust(result["segments"], paragraphs[part])
        results[f"PART{part}_CUES"] = cues
        print(f"Cues for part {part} (len {len(cues)}): {cues}")
        
    with open("scratch/new_cues.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == '__main__':
    main()
