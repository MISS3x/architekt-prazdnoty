/* Offline předpočet spektra pro AUDIO equalizer.
   MP3 → mono PCM (ffmpeg) → FFT po snímcích → log-pásma → kompaktní base64 JSON.
   Běh: node scripts/precompute_spectrum.js
   Výstup: audio/dil_<n>.spectrum.json  (čte se za běhu, žádný mikrofon / živý Web Audio).

   Formát JSON: { sr, fps, bands, frames, duration, data }
   - data = base64 Uint8Array délky frames*bands, hodnota 0..255 = úroveň pásma
   - band 0 = nejnižší frekvence (bass), band N-1 = nejvyšší (treble)
   - snímek pro čas t: frame = floor(t * fps); pásmo b: data[frame*bands + b]
*/
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SR = 22050, FFT = 2048, FPS = 20, BANDS = 32;
const HOP = Math.round(SR / FPS);

// --- iterativní radix-2 FFT (in-place, komplex) ---
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wre = Math.cos(ang), wim = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cre = 1, cim = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tre = re[b] * cre - im[b] * cim;
        const tim = re[b] * cim + im[b] * cre;
        re[b] = re[a] - tre; im[b] = im[a] - tim;
        re[a] += tre; im[a] += tim;
        const ncre = cre * wre - cim * wim;
        cim = cre * wim + cim * wre; cre = ncre;
      }
    }
  }
}

// Hann okno
const win = new Float64Array(FFT);
for (let i = 0; i < FFT; i++) win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT - 1)));

// log-rozložené hrany pásem přes [1, FFT/2)
const edges = [];
const minBin = 1, maxBin = FFT / 2;
for (let b = 0; b <= BANDS; b++) edges.push(Math.floor(minBin * Math.pow(maxBin / minBin, b / BANDS)));

function processFile(mp3, outPath) {
  const pcmBuf = execFileSync("ffmpeg",
    ["-v", "error", "-i", mp3, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 });
  const pcm = new Float32Array(pcmBuf.buffer, pcmBuf.byteOffset, Math.floor(pcmBuf.length / 4));
  const total = pcm.length;
  const frames = Math.max(0, Math.floor((total - FFT) / HOP));
  const out = new Uint8Array(frames * BANDS);
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  for (let f = 0; f < frames; f++) {
    const start = f * HOP;
    for (let i = 0; i < FFT; i++) { re[i] = pcm[start + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let b = 0; b < BANDS; b++) {
      const lo = edges[b], hi = Math.max(lo + 1, edges[b + 1]);
      let mag = 0;
      for (let k = lo; k < hi; k++) {
        const m = re[k] * re[k] + im[k] * im[k];
        if (m > mag) mag = m;
      }
      mag = Math.sqrt(mag);
      const db = 20 * Math.log10(mag / FFT + 1e-6);   // ~ -120..0
      let v = (db + 62) / 52;                          // [-62,-10] dB → [0,1]
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      out[f * BANDS + b] = Math.round(v * 255);
    }
  }
  const duration = total / SR;
  const json = {
    sr: SR, fps: FPS, bands: BANDS, frames,
    duration: +duration.toFixed(2),
    data: Buffer.from(out).toString("base64"),
  };
  const str = JSON.stringify(json);
  fs.writeFileSync(outPath, str);
  console.log(`${path.basename(mp3)} -> ${path.basename(outPath)}  (${frames} frames, ${(Buffer.byteLength(str) / 1024).toFixed(0)} KB)`);
}

const audioDir = path.join(__dirname, "..", "audio");
let done = 0;
for (const n of [1, 2, 3]) {
  const mp3 = path.join(audioDir, `dil_${n}.mp3`);
  if (fs.existsSync(mp3)) { processFile(mp3, path.join(audioDir, `dil_${n}.spectrum.json`)); done++; }
  else console.warn(`chybí ${mp3}`);
}
console.log(`hotovo: ${done} souborů`);
