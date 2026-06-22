import os
import re

def split_into_sentences(text):
    # Regex to split Czech sentences, keeping punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    
    output_path = os.path.join(base_dir, "scratch", "sentence_analysis.txt")
    with open(output_path, "w", encoding="utf-8") as out:
        for filename, part_num in [("dil_1.md", 1), ("dil_2.md", 2)]:
            filepath = os.path.join(base_dir, "story", filename)
            if not os.path.exists(filepath):
                out.write(f"File {filepath} not found.\n")
                continue
                
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Extract paragraphs (lines that are not titles)
            lines = content.split("\n")
            paragraphs = []
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                if line.startswith("🐝") or line.startswith("Kapitola") or line.startswith("- "):
                    continue
                paragraphs.append(line)
                
            out.write(f"\n=== {filename} (Part {part_num}) ===\n")
            total_sentences = 0
            for p_idx, p in enumerate(paragraphs):
                sentences = split_into_sentences(p)
                out.write(f"Paragraph {p_idx+1}: {len(sentences)} sentences\n")
                for s_idx, s in enumerate(sentences):
                    out.write(f"  [{s_idx+1}] {s}\n")
                total_sentences += len(sentences)
            out.write(f"Total sentences: {total_sentences}\n")
    print("Done. Output written to scratch/sentence_analysis.txt")

if __name__ == "__main__":
    main()
