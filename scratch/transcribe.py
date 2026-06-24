import sys, json, time
import whisper

part = sys.argv[1] if len(sys.argv) > 1 else "1"
model_name = sys.argv[2] if len(sys.argv) > 2 else "small"

t0 = time.time()
print(f"[part {part}] loading model '{model_name}'...", flush=True)
model = whisper.load_model(model_name)
print(f"[part {part}] transcribing audio/dil_{part}.mp3 ...", flush=True)
result = model.transcribe(
    f"audio/dil_{part}.mp3",
    language="cs",
    word_timestamps=True,
    verbose=False,
)

words = []
for seg in result["segments"]:
    for w in seg.get("words", []):
        words.append({
            "w": w["word"].strip(),
            "start": round(w["start"], 3),
            "end": round(w["end"], 3),
        })

out = {
    "part": part,
    "model": model_name,
    "duration": round(result.get("segments", [{}])[-1].get("end", 0), 2) if result.get("segments") else 0,
    "text": result["text"].strip(),
    "words": words,
}
with open(f"scratch/whisper_part{part}.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

print(f"[part {part}] DONE in {time.time()-t0:.0f}s — {len(words)} words -> scratch/whisper_part{part}.json", flush=True)
