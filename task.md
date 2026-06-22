# Architekt Prázdnoty — Master Task Plan

> Živý dokument. Cokoliv dokončíme → odškrtneme `[x]`.

## 🚨 Blokující akce (manuální)

> Věci které musíš udělat ručně (API klíče, autentizace, nastavení služeb). Až budou hotové, smažu je.

*Žádné aktuální blokery* ✅

## 📊 Progress: **70 / 70 done (100%)**

```
####################################################################################################  100%
```

| Section | Done | Total | % |
|---|---|---|---|
| HTML | 9 | 9 | 100% |
| CSS | 7 | 7 | 100% |
| JS | 10 | 10 | 100% |
| Kling AI | 4 | 4 | 100% |
| Git | 4 | 4 | 100% |
| State & UI | 7 | 7 | 100% |
| Comic Editor | 10 | 10 | 100% |
| HUD & Editor Mask | 8 | 8 | 100% |
| Video Injection | 5 | 5 | 100% |
| File Renaming | 6 | 6 | 100% |

---

## HTML
- [x] **#1** — Restructure index.html to separate Part 1, Part 2, and Part 3 content containers ✅ completed
- [x] **#2** — Add full story text from `dil_2.md` and `dil_3.md` with proper tags ✅ completed
- [x] **#3** — Implement decryption screens inside `#story-content-part2` and `#story-content-part3` ✅ completed
- [x] **#4** — Insert inline illustration screenshots in text and add a visual gallery footer ✅ completed
- [x] **#19** — Insert Part 3 illustrations into the decrypted story flow ✅ completed
- [x] **#20** — Add Part 3 screenshots to the visual gallery with filter button ✅ completed
- [x] **#23** — Add a third mode button for "// FILMOVÁ VERZE" (Movie Mode) in index.html and update python generators ✅ completed
- [x] **#26** — Add Part switcher buttons (Díl 1, 2, 3) inside `.sticky-mode-switcher` panel in `index.html` ✅ completed
- [x] **#30** — Změna všech textů v komiksové verzi na komiksové bubliny (speech-bubble) ✅ completed

## CSS
- [x] **#5** — Add visibility states for `.story-content` containers and character selector styles ✅ completed
- [x] **#6** — Adjust terminal decryption layout to work as a full-page overlay ✅ completed
- [x] **#7** — Add styles for floating draggable player panels and gallery layout ✅ completed
- [x] **#27** — Move `.sticky-mode-switcher` to top, style the new Part switcher, and implement fully mobile responsive styles ✅ completed
- [x] **#39** — Udelej texty na desktop verzi komiks 2x mensi ✅ completed
- [x] **#40** — Zrušit rámeček kolem titulků ve videu všude ✅ completed

## JS
- [x] **#8** — Implement decryption state tracking (`decryptedPart2`, `decryptedPart3`) in `app.js` ✅ completed
- [x] **#9** — Connect tab switches to show/hide the corresponding dedicated part wrapper ✅ completed
- [x] **#10** — Trigger audio playback on successful decryption / Custom preview video chain ✅ completed
- [x] **#11** — Fix video ended/error looping freeze logic and handle AbortError play promises ✅ completed
- [x] **#12** — Add drag-and-drop listener to floating player panel and setup gallery tab filter triggers ✅ completed
- [x] **#13** — Fix Part 2 relative paragraph indexing mapping logic ✅ completed
- [x] **#21** — Fix paragraph selection by targeting story-content in querySelector to avoid comic panels pollution ✅ completed
- [x] **#24** — Implement movie mode toggle/fullscreen sync in `app.js` and Esc keyboard exit handler ✅ completed
- [x] **#25** — Add manual scroll detection override to release auto-scrolling on user interaction (mouse wheel, touch, keys) with 5s inactivity recovery ✅ completed
- [x] **#28** — Wire click event handlers to sticky part buttons, sync active states, and keep switcher on top in fullscreen overlays ✅ completed

## Kling AI
- [x] **#14** — Create `story/shots_config.json` with prompts for Part 2 ✅ completed
- [x] **#15** — Create `scripts/generate_shots.js` integration script ✅ completed
- [x] **#16** — Test the integration script (dry-run/mock call) ✅ completed
- [x] **#17** — Extract frame screenshots from all generated videos using ffmpeg ✅ completed

## Git
- [x] **#18** — Push changes to git origin ✅ completed
- [x] **#22** — Commit and push Part 3 sync updates and new illustrations to origin ✅ completed
- [x] **#31** — Purge Git history to remove heavy 1440x1440 videos and force push origin ✅ completed
- [x] **#29** — Commit and push new switcher UI layout and mobile responsive styles ✅ completed

## State & UI
- [x] **#32** — Implement state persistence (save activePart, currentTime, activeMode to localStorage) ✅ completed
- [x] **#33** — Implement instant scroll on reload (blocking syncScrollTick while state.restoring is true) ✅ completed
- [x] **#34** — Update poster hero content in setPart ✅ completed
- [x] **#35** — Implement dimmed class logic for story chapter hero ✅ completed
- [x] **#36** — Bind ArrowLeft / ArrowRight keys to scrub audio by sentence (scrubByCue) ✅ completed
- [x] **#37** — Hide footer in fullscreen comic mode (body.comic-fs) to prevent overlapping on mobile ✅ completed
- [x] **#38** — Show sentence navigation buttons (◀ and ▶) on desktop by changing .ap-step from display: none to grid ✅ completed

## Comic Editor
- [x] **#42** — Vytvořit Express backend server (`editor_server.js`) pro operace se soubory a API endpoints ✅ completed
- [x] **#43** — Vytvořit uživatelské rozhraní editoru (`comic_editor.html`) pro review panelů, vět a promptů ✅ completed
- [x] **#44** — Implementovat Kling AI generování a ffmpeg extrakci snímků (prvního frejmu z videa) ✅ completed
- [x] **#45** — Přidat mechanismus zálohování původních souborů do `img/screenshots/backup` ✅ completed
- [x] **#46** — Otestovat kompletní tok generování, schválení, přepsání a zobrazení v komiksu ✅ completed
- [x] **#47** — Přidat funkci ořezu obrázků (16:9, 4:3, 1:1, 3:4, 9:16) s posunem a přepisem původního souboru ✅ completed
- [x] **#48** — Přidat do editoru přepínač zdrojů (Obrázek, Video capture se sliderem, Generování) s možností ořezu zachyceného snímku ✅ completed
- [x] **#49** — Nahradit Kling AI integraci v `editor_server.js` za Gemini API (Imagen 3 a Gemini Flash remake) ✅ completed
- [x] **#50** — Přidat do rozhraní editoru (`comic_editor.html`) možnost zaškrtnutí remaku a napojení na nové API ✅ completed
- [x] **#51** — Opravit kešování a vynutit okamžitou aktualizaci obrázků v levém sloupci a detailu panelu po uložení ořezu nebo schválení verze ✅ completed

## HUD & Editor Mask
- [x] **#52** — Hide Pause button overlay during playback and add a text label in `design.css` ✅ completed
- [x] **#53** — Add screen-tap to play/pause toggle in `app.js` and add text label in `setupGlobalPlayButton` ✅ completed
- [x] **#54** — Add Aspect Ratio Mask styles to `design.css` for `.comic-panel[data-aspect]` ✅ completed
- [x] **#55** — Add the 4th tab UI for Mask Mode in `comic_editor.html` ✅ completed
- [x] **#56** — Implement mask preview and save function in `comic_editor.html` ✅ completed
- [x] **#57** — Parse and return `aspect` in `/api/panels` in `editor_server.js` ✅ completed
- [x] **#58** — Implement `/api/save-mask` POST endpoint in `editor_server.js` ✅ completed
- [x] **#59** — Commit and push changes to git origin ✅ completed

## Video Injection to Film
- [x] **#60** — Add the 5th tab button and container in `comic_editor.html` ✅ completed
- [x] **#61** — Implement drag-and-drop file upload, file reading, and POST logic in `comic_editor.html` ✅ completed
- [x] **#62** — Implement `/api/inject-video` POST endpoint in `editor_server.js` with backups and file writing ✅ completed
- [x] **#63** — Verify video injection locally by uploading a video and playing it in the film section ✅ completed
- [x] **#64** — Commit and push changes to git origin ✅ completed

## File Renaming
- [x] **#65** — Add Rename inputs and button in `comic_editor.html` ZDROJ PANELU pane ✅ completed
- [x] **#66** — Implement `/api/rename-panel-files` in `editor_server.js` ✅ completed
- [x] **#67** — Update `app.js` to support the `data-video` attribute for custom video playback ✅ completed
- [x] **#68** — Update `/api/panels` in `editor_server.js` to parse and return `data-video` ✅ completed
- [x] **#69** — Verify file renaming works (image & video renamed, HTML updated, plays in Movie mode) ✅ verified by subagent
- [x] **#70** — Git commit and push all changes ✅ completed

