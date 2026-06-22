# Architekt Prázdnoty — Master Task Plan

> Živý dokument. Cokoliv dokončíme → odškrtneme `[x]`.

## 🚨 Blokující akce (manuální)

*Žádné aktuální blokery* ✅

## 📊 Progress: **25 / 29 done (86%)**

```
######################################################################################-------------- 86%
```

| Section | Done | Total | % |
|---|---|---|---|
| HTML | 7 | 8 | 88% |
| CSS | 3 | 4 | 75% |
| JS | 9 | 10 | 90% |
| Kling AI | 4 | 4 | 100% |
| Git | 2 | 3 | 67% |

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

## CSS
- [x] **#5** — Add visibility states for `.story-content` containers and character selector styles ✅ completed
- [x] **#6** — Adjust terminal decryption layout to work as a full-page overlay ✅ completed
- [x] **#7** — Add styles for floating draggable player panels and gallery layout ✅ completed
- [x] **#27** — Move `.sticky-mode-switcher` to top, style the new Part switcher, and implement fully mobile responsive styles ✅ completed

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
- [ ] **#29** — Commit and push new switcher UI layout and mobile responsive styles
