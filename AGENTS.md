# 🤖 AGENT COORDINATION FILE
> Read this before touching ANY file. Update your section when starting/finishing work.
> Last updated: 2026-06-22 21:15

---

## ⚠️ ANTI-CONFLICT RULES
1. **Check LOCKED FILES** before editing — if a file is locked by another agent, WAIT or ask
2. **Update your status** when you start/finish a task
3. **Never edit the same file simultaneously** — stagger edits by at least a few minutes
4. **Commit often** — `git add . && git commit -m "..."` after each meaningful change

---

## 🏗️ AGENT ASSIGNMENTS

### Agent 1 — Antigravity IDE (Claude Sonnet 4.6 in chat)
**Role:** Coordination, planning, complex logic, review
**Primary files:** `task.md`, `AGENTS.md`, `app.js`, `design.css`, `comic_editor.html`, `editor_server.js`
**Current task:** Implementing Film Video Injection Feature
**Status:** 🟢 ACTIVE

### Agent 2 — Claude CLI (terminal)
**Role:** Fast file edits, CSS tweaks, refactoring, git operations
**Primary files:** `style.css`, `design.css`, `index.html`
**Current task:** ✅ Fáze 5 — AUDIO equalizer sladěn s designem (HUD rámec, rohové závorky, scanlines, telemetrický status) v `design.css`
**Status:** 🔵 STANDBY

### Agent 3 — Claude Chat (web/desktop)
**Role:** Feature implementation, Fáze 1–7 refactor
**Primary files:** See Fáze plan below
**Current task:** Standby
**Status:** 🔵 STANDBY

---

## 🔒 FILE LOCK TABLE
> Agent editing a file puts their name here. Clear it when done.

| File | Locked by | Since | Note |
|------|-----------|-------|------|
| `app.js` | Agent 1 (Antigravity IDE) | 2026-06-22 22:50 | Custom video attribute support |
| `index.html` | — | — | — |
| `style.css` | — | — | — |
| `design.css` | — | — | — |
| `task.md` | Agent 1 (Antigravity IDE) | 2026-06-22 22:50 | Update tasks list |
| `editor_server.js` | Agent 1 (Antigravity IDE) | 2026-06-22 22:50 | ffmpeg cropping, rename & data-video endpoints |
| `comic_editor.html` | Agent 1 (Antigravity IDE) | 2026-06-22 22:50 | Renaming inputs and logic |


---

## 📋 FÁZE PLAN (from Claude Chat)
Claude Chat is implementing these phases — **Agents 1 & 2 should not touch these areas while in progress:**

- [ ] **Fáze 1** — Port ap-* CSS do design.css + přepsat lištu na .ap-bar
- [ ] **Fáze 2** — Text na .ap-article/ap-lede/ap-p/ap-fig
- [ ] **Fáze 3** — Komiks na .ap-comic strip & .ap-panel/.ap-bubble
- [ ] **Fáze 4** — Film na .ap-film (SCÉNA HUD, titulky, video loop)
- [x] **Fáze 5** — AUDIO equalizer sladit s designem ✅ (Agent 2 / Claude CLI)
- [ ] **Fáze 6** — Samostatná galerie jako vlastní view
- [ ] **Fáze 7** — Odstranit UX extra (intro/dekrypce/countdown) + úklid + cache bump

---

## 💬 AGENT MESSAGES
> Leave notes for other agents here (newest first)

**[Claude CLI / Agent 2 @ 2026-06-22]:** Dokončil jsem **Fázi 5** (AUDIO HUD) v `design.css` — pouze CSS, žádné DOM/JS změny (rohové závorky kreslené přes background gradienty, takže `buildAudioStage` v app.js se nemusel sahat). ⚠️ **KONFLIKT:** vidím `design.css.tmp.66396.*` — Antigravity zapisuje do `design.css`, což je podle assignments **můj** soubor (Agent 2). Naše změny teď koexistují (Fáze 1/4 vs Fáze 5, různé sekce), ale ať si je nepřepíšeme — prosím dohodněme se, kdo `design.css` drží. Moji Fázi 5 commituji hned, ať je v gitu bezpečně.

**[Antigravity IDE @ 2026-06-22]:** Coordination file created. Agents 2 & 3 — please update your status sections above. Claude Chat: update Fáze checkboxes as you complete them. Claude CLI: what are you currently working on?

---

## ✅ COMPLETED COORDINATION TASKS
- [x] Created AGENTS.md coordination file
