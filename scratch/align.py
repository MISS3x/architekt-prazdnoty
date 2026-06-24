# -*- coding: utf-8 -*-
import sys, json, re, unicodedata, difflib

part = sys.argv[1] if len(sys.argv) > 1 else "1"

def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s

panels = json.load(open("scratch/panels.json", encoding="utf-8"))[part]
wj = json.load(open(f"scratch/whisper_part{part}.json", encoding="utf-8"))
asr = [w for w in wj["words"] if norm(w["w"])]

# truth tokens: (panel_ord, norm)
truth = []
for p in panels:
    for tok in p["text"].split():
        n = norm(tok)
        if n:
            truth.append((p["ord"], n))

truth_norm = [t[1] for t in truth]
asr_norm = [norm(w["w"]) for w in asr]
asr_start = [w["start"] for w in asr]

# map truth index -> asr index via sequence matching
sm = difflib.SequenceMatcher(None, truth_norm, asr_norm, autojunk=False)
t2a = {}
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1):
            t2a[i1 + k] = j1 + k

# truth index -> time (only matched)
t_time = {i: asr_start[j] for i, j in t2a.items()}
matched = len(t_time)

# panel -> first matched truth token time
# build per-panel list of truth indices
panel_tok_idx = {}
for idx, (pord, _) in enumerate(truth):
    panel_tok_idx.setdefault(pord, []).append(idx)

n_panels = len(panels)
panel_time = [None] * n_panels
for pord in range(n_panels):
    for ti in panel_tok_idx.get(pord, []):
        if ti in t_time:
            panel_time[pord] = round(t_time[ti], 2)
            break

# fill gaps: forward/back interpolation + enforce monotonic
# first, anchor known
known = [(i, panel_time[i]) for i in range(n_panels) if panel_time[i] is not None]
if not known:
    print("ERROR: no panels matched")
    sys.exit(1)

# extrapolate ends
if panel_time[0] is None:
    panel_time[0] = max(0.0, known[0][1] - 1.0)
if panel_time[-1] is None:
    panel_time[-1] = known[-1][1]

# linear interpolate Nones between known anchors
i = 0
while i < n_panels:
    if panel_time[i] is None:
        # find prev known
        a = i - 1
        b = i
        while b < n_panels and panel_time[b] is None:
            b += 1
        ta = panel_time[a]
        tb = panel_time[b] if b < n_panels else ta + (b - a)
        span = b - a
        for k in range(1, span):
            panel_time[a + k] = round(ta + (tb - ta) * k / span, 2)
        i = b
    else:
        i += 1

# enforce monotonic non-decreasing
for i in range(1, n_panels):
    if panel_time[i] < panel_time[i - 1]:
        panel_time[i] = panel_time[i - 1]

# derive paragraph cues: first panel time per di (in order of di)
di_order = []
di_first = {}
for p in panels:
    di = int(p["di"])
    if di not in di_first:
        di_first[di] = panel_time[p["ord"]]
        di_order.append(di)
para_cues = [round(di_first[d], 2) for d in sorted(di_order)]

out = {"part": part, "panel_times": panel_time, "para_cues": para_cues,
       "matched_tokens": matched, "total_truth": len(truth)}
json.dump(out, open(f"scratch/panel_times_part{part}.json", "w", encoding="utf-8"), ensure_ascii=False)

print(f"part {part}: panels={n_panels} matched_tokens={matched}/{len(truth)} ({100*matched//len(truth)}%)")
print("para_cues:", para_cues)
print("first 12 panel_times:", panel_time[:12])
