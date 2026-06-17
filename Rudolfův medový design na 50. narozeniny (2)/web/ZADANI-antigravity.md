# Zadání pro Antigravity — „Architekt prázdnoty" (audio-příběh, web)

## 1. Cíl
Jednostránkový **tmavý cyberpunkový web** s audio-povídkou „Architekt prázdnoty" (RUDA-50).
Návštěvník spustí audio a text příběhu se **v reálném čase zvýrazňuje** podle toho, kde se právě nachází vyprávění (real-time transkript / karaoke pro odstavce). Na pozadí se plynule prolínají atmosférické ilustrace, volitelně i video.

Hotový referenční prototyp je v tomto balíčku: **`Pribeh.dc.html`** (běží v editoru, kde vznikl). Antigravity má z něj udělat **čistou, samostatnou statickou stránku** (vanilla HTML/CSS/JS, žádný proprietární runtime), případně React, podle preference.

> Pozn.: `Pribeh.dc.html` + `support.js` jsou formát „Design Component" z prostředí, kde prototyp vznikl. Slouží jako **referenční implementace** (logika i markup). Cílový web ať je obyčejný `index.html` + `style.css` + `app.js`.

## 2. Tech / stack
- Čistý **HTML + CSS + JS** (bez frameworku), nebo Vite + vanilla TS. Žádné těžké závislosti.
- Fonty (Google Fonts): **Chakra Petch** (nadpisy, UI), **JetBrains Mono** (mono popisky/kódy), **Newsreader** (tělo textu, kurzíva).
- Plně responzivní, mobile-first; funguje offline po nasazení (relativní cesty k assetům).

## 3. Vizuální styl (design tokens)
| Token | Hodnota | Použití |
|---|---|---|
| `--bg` | `#06080b` | pozadí stránky |
| `--panel` | `rgba(8,11,16,.88)` | čtecí panel s textem (backdrop-blur 3px) |
| `--cyan` | `#41e0ff` | akcent, aktivní řádek, glow, progress |
| `--amber` | `#ffb52e` | sekundární akcent (kódová slova: SHUTDOWN, nápis na minci) |
| `--text` | `#dfe7f1` | tělo textu |
| `--muted` | `#6b7787` | mono popisky |

- Estetika: scanline overlay (jemné vodorovné linky, `mix-blend:multiply`, opacity ~.5), neonové glow stíny u akcentů, monospace „HUD" popisky se `//` prefixem a `letter-spacing`.
- Velký hero: titul `ARCHITEKT PRÁZDNOTY` (Chakra Petch 700, clamp 52→128px, cyan text-shadow), nadtitul `// A NEW BERLIN STORY · RUDA-50`.

## 4. Funkce

### 4.1 Audio přehrávač
- Velké kruhové **play/pause** tlačítko (cyan, glow).
- **Progress bar** (klik = seek), zobrazení `aktuální / celkový čas` (mm:ss).
- Audio soubor: `audio/pribeh.mp3` (~5,9 MB, délka ~6:22).
- **Ošetřit MP3 bez metadat o délce:** některé streamované MP3 hlásí `duration = Infinity/NaN`. Řešení: po `loadedmetadata` zkontrolovat `isFinite(duration)`; pokud ne, nastavit `currentTime = 1e7`, počkat na `durationchange`, přečíst skutečnou délku a vrátit `currentTime = 0`. (Viz referenční metoda `fixInfinite()`.)

### 4.2 Real-time transkript (jádro)
- Text příběhu je rozdělen na **20 bloků** s atributem `data-i="0..19"` (odstavce, citát, odrážky, závěrečná otázka).
- Časování je pole **cues** = čas startu každého bloku v sekundách: `cues[i]`.
- Při `timeupdate` se určí aktivní index = poslední blok, jehož `cue <= currentTime`.
- Aktivní blok: plná `opacity`, levý cyan border + jemný glow. Ostatní: `opacity .3`. Plynulé `transition`.
- Aktivní blok se při přehrávání **plynule scrolluje** do ~40 % výšky okna (NE `scrollIntoView`; použít `window.scrollTo({behavior:'smooth'})` s dopočtem pozice; scrollovat jen když je blok mimo komfortní zónu).

### 4.3 Výchozí odhad časování
- Když nejsou uložené přesné cues, **nasadit odhad proporčně podle délky textu** bloku (delší blok = delší čas), aby transkript fungoval hned po načtení délky audia.
- Vzorec: `cue[i] = dur * (sumDélekPřed_i / součetVšechDélek)`, min. délka bloku 10 znaků.

### 4.4 Kalibrace (přesné časování)
- Tlačítko **„Synchronizace textu"** zapne kalibrační režim: kurzor `crosshair`, bloky orámované čárkovaně.
- Uživatel pustí audio a **klikne na blok** přesně v okamžiku, kdy ho vypravěč začíná → uloží `cues[i] = currentTime`.
- **Export časování**: stáhne `ruda_cues.json` (pole čísel/`null`) + zkopíruje do schránky.
- **Reset**: zpět na proporční odhad.
- Cues persistovat v `localStorage` pod klíčem `ruda_cues_v2` (NEpřepisovat cizí klíče).
- Finální časování z `ruda_cues.json` ať jde **napevno zapéct** do kódu (konstanta `CUES`), aby web fungoval přesně bez kalibrace.

### 4.5 Pozadí
- **Rotující prolínající se obrázky**: 6 variant (`img/bg1.jpg`…`bg6.jpg`) — duotónové (cyan/amber) deriváty 3 referenčních ilustrací. `position:fixed`, cross-fade `opacity` ~2,2 s, jemný Ken-Burns `scale(1.0→1.08)`, střídání à 9 s. Nad nimi tmavý radiální „veil" pro čitelnost.
- **Volitelně (verze 2):** místo statických pozadí použít **video** (složka `video/`, viz §5) jako pozadí jednotlivých sekcí — ztlumené, `loop`, `playsinline`, `muted`, s tmavým překryvem. Videa odpovídají scénám příběhu (viz názvy souborů).

## 5. Assety v balíčku
```
img/a.jpg            – ilustrace: panorama Nového Berlína s postavou (hero/ref)
img/b.jpg            – mechatronická včela v laně (sekce I)
img/c.jpg            – „mince" HONEY SUPERFUEL CELL, kyborg-portrét (sekce II)
img/bg1..bg6.jpg     – duotónová pozadí (cyan/amber) odvozená z a/b/c
audio/pribeh.mp3     – kompletní namluvený příběh (~6:22)
video/01-architekt-a.mp4, 01-architekt-b.mp4   – scéna: úvod / Architekt
video/02-ruda-byl-jiny-a.mp4, 02-ruda-byl-jiny-b.mp4 – scéna: „Ruda byl jiný"
video/03-nebehal-na.mp4        – scéna: „Neběhal na trenažérech"
video/04-ruda-muller.mp4       – scéna: Ruda Müller
video/05-nejdivnejsi.mp4       – scéna: „Nejdivnější nález"
Pribeh.dc.html       – referenční prototyp (markup + logika)
Architekt-prazdnoty.md (volitelně) – plný text příběhu
```

## 6. Obsah příběhu
Plný text je v `Pribeh.dc.html` (20 bloků `data-i`). Struktura:
- Hero titul + perex.
- Úvod (bloky 0–3).
- Sekce **I · MĚSÍC MIMO SÍŤ**: citát (blok 4) + bloky 5–7. Mezi sekcemi ilustrace `b.jpg`.
- Ilustrace `c.jpg`.
- Sekce **II · POSLEDNÍ ZÁHADA**: bloky 8–11, 3 odrážky (12–14), bloky 15–18.
- Archivní záznam `// ARCHIVNÍ ZÁZNAM · 10 · 06 · 2076` + závěrečná **otázka** (blok 19): *„Je Ruda Müller opravdu pryč — nebo teď běhá uvnitř samotné sítě?"*

## 7. Akceptační kritéria
1. Stránka je samostatná (otevře se dvojklikem / z `index.html`), bez proprietárního runtime.
2. Play spustí audio; progress + čas se aktualizují; seek funguje.
3. Během přehrávání se zvýrazňuje vždy právě jeden blok a plynule scrolluje.
4. Funguje i pro MP3 bez délkových metadat (viz §4.1).
5. Pozadí se plynule prolíná, text zůstává čitelný.
6. Responzivní na mobilu (titul se zmenší, přehrávač i text se vejdou).
7. Žádné chyby v konzoli.

## 8. Nice-to-have (volitelné)
- Video-pozadí podle sekcí (§4.5).
- Word-level zvýraznění (po slovech) — vyžaduje forced-alignment / ASR timestampy.
- Tlačítko „prepnout cyan/amber" téma.
- Sdílení / OG meta.
