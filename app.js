/**
 * Architekt prázdnoty - Application logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  const state = {
    playing: false,
    currentTime: 0,
    duration: 0,
    calibMode: false,
    loaded: false,
    msg: "",
    curIdx: -1,
    activeVideoSrc: ""
  };

  // All video backgrounds to cycle through
  const videos = [
    "video/01-architekt-a.mp4",
    "video/01-architekt-b.mp4",
    "video/02-ruda-byl-jiny-a.mp4",
    "video/02-ruda-byl-jiny-b.mp4",
    "video/03-nebehal-na.mp4",
    "video/04-ruda-muller.mp4",
    "video/05-nejdivnejsi.mp4",
    "video/06-a-v-ten-moment.mp4"
  ];
  let videoIdx = 0;
  let videoTimer = null;

  let cues = null;
  let N = 0;
  let paras = [];

  // --- DOM ELEMENTS ---
  const audio = document.getElementById("audio-element");
  const playBtn = document.getElementById("play-btn");
  const playIcon = document.getElementById("play-icon");
  const progressBar = document.getElementById("progress-bar");
  const progressFill = document.getElementById("progress-fill");
  const timeCurrent = document.getElementById("time-current");
  const timeDuration = document.getElementById("time-duration");
  const playerStatus = document.getElementById("player-status");
  const btnSync = document.getElementById("btn-sync");
  const btnExport = document.getElementById("btn-export");
  const btnReset = document.getElementById("btn-reset");
  const fileAudio = document.getElementById("file-audio");
  const hintText = document.getElementById("hint-text");
  
  const bgContainer = document.getElementById("bg-container");
  const bgImages = Array.from(document.querySelectorAll(".bg-image"));
  const videoBgContainer = document.getElementById("video-bg-container");

  // Dual video elements for crossfading
  const bgVideo1 = document.getElementById("bg-video-1") || document.getElementById("bg-video");
  const bgVideo2 = document.getElementById("bg-video-2");
  
  // Dual video preview elements
  const prevVideo1 = document.getElementById("prev-video-1");
  const prevVideo2 = document.getElementById("prev-video-2");
  const previewSubtitles = document.getElementById("preview-subtitles");
  
  let currentVideoEl = bgVideo1;
  let nextVideoEl = bgVideo2 || bgVideo1;

  let currentPrevEl = prevVideo1;
  let nextPrevEl = prevVideo2 || prevVideo1;

  // --- INITIALIZATION ---
  const init = () => {
    // 1. Gather paragraph elements
    paras = Array.from(document.querySelectorAll("[data-i]"));
    paras.sort((a, b) => parseInt(a.dataset.i) - parseInt(b.dataset.i));
    N = paras.length;

    // 2. Wrap words in paragraphs for karaoke
    paras.forEach(p => {
      wrapWords(p);
    });

    // 3. Load stored cues if any
    let stored = null;
    try {
      const s = localStorage.getItem("ruda_cues_v2");
      if (s) stored = JSON.parse(s);
    } catch (e) {
      console.warn("Could not parse cues from localStorage", e);
    }

    if (stored && stored.length === N && stored.some(x => typeof x === "number")) {
      cues = stored;
      setHint("Časování načteno z lokální paměti.");
    }

    // 4. Attach paragraph click listeners (for calibration)
    paras.forEach((p, idx) => {
      p.addEventListener("click", () => onParaClick(idx));
    });

    // 5. Setup video background rotation
    startVideoRotation();

    // 6. Setup audio listeners
    setupAudioListeners();

    // 7. Setup UI controls listeners
    setupUIListeners();
  };

  // --- DOM WORD WRAPPING ---
  const wrapWords = (element) => {
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        // Split text by whitespace, keeping spaces
        const words = text.split(/(\s+)/);
        const fragment = document.createDocumentFragment();
        
        words.forEach(word => {
          if (word.trim().length > 0) {
            const span = document.createElement("span");
            span.className = "word";
            span.textContent = word;
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(word));
          }
        });
        
        node.parentNode.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains("dropcap") || node.classList.contains("bullet-marker")) {
          return;
        }
        const children = Array.from(node.childNodes);
        children.forEach(walk);
      }
    };
    
    const children = Array.from(element.childNodes);
    children.forEach(walk);
  };

  // --- AUDIO LOGIC ---
  const setupAudioListeners = () => {
    if (!audio) return;

    const onMeta = () => {
      const d = audio.duration;
      if (isFinite(d) && d > 0) {
        state.duration = d;
        state.loaded = true;
        updateStatus();
        seedCues();
      } else {
        if (!state.loaded) {
          state.loaded = true;
          updateStatus();
        }
        fixInfinite();
      }
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("canplay", onMeta);
    
    audio.addEventListener("timeupdate", () => {
      state.currentTime = audio.currentTime;
      onTimeUpdate();
    });

    audio.addEventListener("play", () => {
      state.playing = true;
      playIcon.textContent = "❚❚";
      updateStatus();
      
      // Sync video state
      if (currentVideoEl) currentVideoEl.play().catch(() => {});
      if (currentPrevEl) currentPrevEl.play().catch(() => {});
    });

    audio.addEventListener("pause", () => {
      state.playing = false;
      playIcon.textContent = "▶";
      updateStatus();
    });

    audio.addEventListener("ended", () => {
      state.playing = false;
      playIcon.textContent = "▶";
      updateStatus();
    });

    // Check if metadata is already loaded
    if (audio.readyState >= 1) {
      onMeta();
    }
  };

  const fixInfinite = () => {
    if (audio._fixing) return;
    audio._fixing = true;
    
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.removeEventListener("durationchange", onDurationChange);
        try {
          audio.currentTime = 0;
        } catch (e) {}
        state.duration = audio.duration;
        state.loaded = true;
        updateStatus();
        seedCues();
      }
    };
    
    audio.addEventListener("durationchange", onDurationChange);
    try {
      audio.currentTime = 1e7;
    } catch (e) {}
  };

  const seedCues = () => {
    if (cues || !(state.duration > 0)) return;
    
    const lens = paras.map(p => Math.max(10, (p.textContent || "").trim().length));
    const totalLength = lens.reduce((sum, len) => sum + len, 0);
    
    const newCues = [];
    let acc = 0;
    
    for (let i = 0; i < N; i++) {
      newCues.push(parseFloat((state.duration * (acc / totalLength)).toFixed(2)));
      acc += lens[i];
    }
    
    cues = newCues;
    setHint("Vytvořen automatický odhad časování podle délky odstavců.");
  };

  const onTimeUpdate = () => {
    // 1. Update progress bar
    if (state.duration) {
      const pct = (state.currentTime / state.duration) * 100;
      progressFill.style.width = `${pct}%`;
      timeCurrent.textContent = formatTime(state.currentTime);
      timeDuration.textContent = formatTime(state.duration);
    }

    // 2. Identify active block index
    const activeIdx = getActiveIndex(state.currentTime);
    if (activeIdx !== state.curIdx) {
      state.curIdx = activeIdx;
      highlightParagraph(activeIdx);
      
      // Update preview subtitles
      if (activeIdx !== -1 && paras[activeIdx]) {
        previewSubtitles.textContent = paras[activeIdx].textContent.trim();
        previewSubtitles.style.color = "var(--cyan)";
      } else {
        previewSubtitles.textContent = state.playing ? "// FEED ACTIVE" : "// SYSTEM STANDBY";
        previewSubtitles.style.color = "var(--muted)";
      }
      
      if (state.playing && !state.calibMode) {
        scrollToParagraph(activeIdx);
      }
    }

    // 3. Karaoke highlight inside the active paragraph
    highlightWords(activeIdx, state.currentTime);
  };

  const getActiveIndex = (t) => {
    if (!cues) return -1;
    let idx = -1;
    for (let i = 0; i < N; i++) {
      if (cues[i] != null && t >= cues[i] - 0.02) {
        idx = i;
      }
    }
    return idx;
  };

  // --- KARAOKE WORD HIGHLIGHT ---
  const highlightWords = (pIdx, curTime) => {
    if (pIdx < 0 || !cues) return;
    
    const pEl = paras[pIdx];
    if (!pEl) return;
    
    const tStart = cues[pIdx];
    const tEnd = (pIdx < N - 1 && cues[pIdx + 1] != null) ? cues[pIdx + 1] : state.duration;
    const duration = tEnd - tStart;
    
    if (duration <= 0) return;
    
    const progress = (curTime - tStart) / duration;
    const words = pEl.querySelectorAll(".word");
    const wordsCount = words.length;
    
    if (wordsCount === 0) return;
    
    // Estimate active word index proportionally
    const activeWordIdx = Math.floor(progress * wordsCount);
    
    words.forEach((word, wIdx) => {
      if (wIdx <= activeWordIdx) {
        word.classList.add("read");
      } else {
        word.classList.remove("read");
      }
    });
  };

  // --- TRANSCRIPT VISUALS ---
  const highlightParagraph = (idx) => {
    paras.forEach((p, i) => {
      const on = i === idx;
      p.classList.toggle("active", on);
      
      // Handle non-active paragraphs clean up of read words
      if (!on) {
        p.querySelectorAll(".word").forEach(w => w.classList.remove("read"));
      }
    });
  };

  const scrollToParagraph = (idx) => {
    const el = paras[idx];
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const midPoint = window.innerHeight * 0.4;
    
    if (rect.top < midPoint * 0.5 || rect.top > window.innerHeight * 0.8) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + rect.top - midPoint),
        behavior: "smooth"
      });
    }
  };

  // --- BACKGROUNDS & VIDEOS ---
  const startVideoRotation = () => {
    videoBgContainer.classList.add("active");
    
    // Play first video
    playNextVideo(videos[videoIdx]);
    
    // Set timer to change video every 12 seconds
    videoTimer = setInterval(() => {
      videoIdx = (videoIdx + 1) % videos.length;
      playNextVideo(videos[videoIdx]);
    }, 12000);
  };

  const playNextVideo = (src) => {
    nextVideoEl.src = src;
    nextVideoEl.load();
    nextVideoEl.play().catch(e => console.error("BG video play failed:", e));

    if (nextPrevEl) {
      nextPrevEl.src = src;
      nextPrevEl.load();
      nextPrevEl.play().catch(e => console.error("Prev video play failed:", e));
    }

    nextVideoEl.classList.add("active");
    if (nextPrevEl) nextPrevEl.classList.add("active");
    
    const oldVideoEl = currentVideoEl;
    const oldPrevEl = currentPrevEl;

    if (oldVideoEl !== nextVideoEl) {
      oldVideoEl.classList.remove("active");
      if (oldPrevEl) oldPrevEl.classList.remove("active");
      setTimeout(() => {
        oldVideoEl.pause();
        if (oldPrevEl) oldPrevEl.pause();
      }, 2200); // Wait for the 2.2s CSS opacity transition
    }
    
    // Swap roles
    const temp = currentVideoEl;
    currentVideoEl = nextVideoEl;
    nextVideoEl = temp;

    const tempPrev = currentPrevEl;
    currentPrevEl = nextPrevEl;
    nextPrevEl = tempPrev;
  };

  // --- UI LISTENERS & CONTROL handlers ---
  const setupUIListeners = () => {
    // Play/Pause Click
    playBtn.addEventListener("click", togglePlay);

    // Seek Click
    progressBar.addEventListener("click", seek);

    // Sync Mode Toggle
    btnSync.addEventListener("click", toggleCalibration);

    // Export Cues
    btnExport.addEventListener("click", exportCues);

    // Reset Cues
    btnReset.addEventListener("click", resetCues);

    // Load custom audio
    fileAudio.addEventListener("change", loadAudioFile);
  };

  const togglePlay = () => {
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(e => console.error("Audio playback error:", e));
    } else {
      audio.pause();
    }
  };

  const seek = (e) => {
    if (!audio || !state.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * state.duration;
  };

  const toggleCalibration = () => {
    state.calibMode = !state.calibMode;
    btnSync.classList.toggle("calib-active", state.calibMode);
    
    paras.forEach(p => {
      p.classList.toggle("calib-outline", state.calibMode);
    });

    if (state.calibMode) {
      highlightParagraph(-1); // Remove main highlights in calib mode
      setHint("Režim kalibrace: pusť audio a klikni na odstavec přesně ve chvíli, kdy ho vyprávěč začíná.");
    } else {
      setHint("Synchronizace textu vypnuta.");
      onTimeUpdate();
    }
  };

  const onParaClick = (idx) => {
    if (!state.calibMode || !audio) return;
    
    if (!cues) cues = new Array(N).fill(null);
    cues[idx] = parseFloat(audio.currentTime.toFixed(2));
    
    // Persist
    try {
      localStorage.setItem("ruda_cues_v2", JSON.stringify(cues));
    } catch (e) {
      console.warn("Could not save cues", e);
    }

    // Visual flash feedback
    const p = paras[idx];
    if (p) {
      p.classList.add("calib-flash");
      setTimeout(() => {
        p.classList.remove("calib-flash");
      }, 320);
    }

    setHint(`Odstavec ${idx} → ${formatTime(audio.currentTime)} (uloženo)`);
  };

  const exportCues = () => {
    if (!cues) return;
    
    const data = JSON.stringify(cues.map(c => c == null ? null : parseFloat(c.toFixed(2))));
    
    // Copy to clipboard
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(data);
      }
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
    
    // Download JSON
    try {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ruda_cues.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }

    setHint("Časování bylo staženo jako ruda_cues.json a uloženo do schránky.");
  };

  const resetCues = () => {
    cues = null;
    try {
      localStorage.setItem("ruda_cues_v2", "null");
    } catch (e) {}
    
    seedCues();
    state.curIdx = -1;
    highlightParagraph(-1);
    
    setHint("Časování bylo resetováno na proporcionální odhad.");
  };

  const loadAudioFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !audio) return;
    
    audio.src = URL.createObjectURL(file);
    audio.load();
    
    // Reset state
    state.duration = 0;
    state.loaded = false;
    state.curIdx = -1;
    cues = null;
    
    setHint(`Načteno vlastní audio: ${file.name}`);
  };

  // --- UTILS ---
  const formatTime = (t) => {
    t = Math.max(0, t || 0);
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const updateStatus = () => {
    if (state.playing) {
      playerStatus.textContent = "PŘEHRÁVÁ SE";
      playerStatus.style.color = "var(--cyan)";
    } else if (state.loaded) {
      playerStatus.textContent = "PŘIPRAVENO";
      playerStatus.style.color = "var(--muted)";
    } else {
      playerStatus.textContent = "NAČÍTÁM…";
      playerStatus.style.color = "var(--muted)";
    }
  };

  const setHint = (msg) => {
    state.msg = msg;
    hintText.textContent = msg;
  };

  // --- BOOT ---
  init();
});
