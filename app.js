/**
 * Architekt prázdnoty - Application logic
 */

document.addEventListener("DOMContentLoaded", () => {

  const IS_MOBILE = window.innerWidth <= 768;
  const getVideoPath = (path) => {
    if (!path || typeof path !== 'string') return path;
    if (IS_MOBILE && path.includes('.mp4') && !path.includes('_mobile.mp4')) {
      return path.replace('.mp4', '_mobile.mp4');
    }
    return path;
  };
  
  // Set hero video src dynamically for mobile
  const heroVideoSource = document.getElementById("hero-video-source");
  if (heroVideoSource) {
    heroVideoSource.src = getVideoPath("video/hero.mp4");
    if (heroVideoSource.parentElement) heroVideoSource.parentElement.load();
  }

  // --- STATE ---
  const state = {
    playing: false,
    currentTime: 0,
    duration: 0,
    calibMode: false,
    loaded: false,
    msg: "",
    curIdx: -1,
    activeVideoSrc: "",
    autoplayAttempted: false,
    activePart: 1,
    decryptedPart2: localStorage.getItem("decrypted_part2") === "true",
    decryptedPart3: localStorage.getItem("decrypted_part3") === "true",
    fullscreenMode: false,
    comicMode: false,
    audioMode: false
  };

  // All video backgrounds to cycle through (using valid Part 1 generated clips as base)
  const videos = [
    "video/dil_1/01_01_01.mp4",
    "video/dil_1/01_01_02.mp4",
    "video/dil_1/01_02_01.mp4",
    "video/dil_1/01_03_01.mp4",
    "video/dil_1/01_04_01.mp4",
    "video/dil_1/01_05_01.mp4",
    "video/dil_1/01_06_01.mp4",
    "video/dil_1/01_07_01.mp4"
  ];
  let videoIdx = 0;
  let videoTimer = null;

  const PART1_CUES = [
    6.40, 29.00, 62.00, 78.00, 86.00, 95.00, 119.00, 162.00, 175.00, 200.00,
    207.00, 220.00, 229.00, 247.00, 265.00, 279.00, 295.00, 324.00, 353.00, 376.00
  ];

  const PART2_CUES = [
    10.0, 39.0, 64.0, 106.0, 130.0, 150.0, 163.0, 185.0, 224.0, 257.0, 293.0, 301.0
  ];

  const PART3_CUES = [
    10.34, 47.64, 86.44, 126.94, 146.04, 182.24, 217.34, 247.94, 259.54, 265.14, 298.04, 319.44, 347.64, 372.94, 402.44
  ];

  let cues = null;
  let N = 0;
  let paras = [];
  let lastUserScrollTime = 0;
  let pendingPlayHandler = null;
  const COUNTDOWN_SECONDS = 7; // static-poster countdown before comic/film starts
  let countdownTimer = null;
  const POSTERS = { 1: "avatar/ruda/ruda.png", 2: "avatar/mia/mia.png", 3: "avatar/krtek/krtek.png" };

  // --- DOM ELEMENTS ---
  const _dummy = document.createElement("div");
  const audio = document.getElementById("audio-element"); // Audio element still exists
  const playBtn = document.getElementById("play-btn") || _dummy;
  const playBtnWrapper = document.getElementById("play-btn-wrapper") || _dummy;
  const playIcon = document.getElementById("play-icon") || _dummy;
  const progressBar = document.getElementById("progress-bar") || _dummy;
  const progressFill = document.getElementById("progress-fill") || _dummy;
  const timeCurrent = document.getElementById("time-current") || _dummy;
  const timeDuration = document.getElementById("time-total") || _dummy;

  // --- TOP BAR TRANSPORT (TRON design) ---
  const barPlay = document.getElementById("bar-play");
  const barStop = document.getElementById("bar-stop");
  const barScrub = document.getElementById("bar-scrub");
  const barFill = document.getElementById("bar-fill");
  const barKnob = document.getElementById("bar-knob");
  const barTimeCur = document.getElementById("bar-time-cur");
  const barTimeDur = document.getElementById("bar-time-dur");
  const setBarPlayIcon = (playing) => { if (barPlay) barPlay.textContent = playing ? "❚❚" : "▶"; };
  const barEpTitle = document.getElementById("bar-eptitle");
  const EP_TITLES = { 1: { rom: "I", t: "ARCHITEKT PRÁZDNOTY" }, 2: { rom: "II", t: "VČELÍ MOR A NEURO-NEKRÓZA" }, 3: { rom: "III", t: "MATEŘÍ KAŠIČKA 2.0" } };
  const updateBarEpTitle = (partNum) => {
    const e = EP_TITLES[partNum]; if (barEpTitle && e) barEpTitle.innerHTML = `<b>DÍL ${e.rom}</b> · ${e.t}`;
  };

  // --- COUNTDOWN INTRO (static poster + 7s countdown before comic/film) ---
  const ensureCountdownOverlay = () => {
    let el = document.getElementById("countdown-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "countdown-overlay";
      el.className = "countdown-overlay hidden";
      el.innerHTML =
        '<img class="cd-img" alt="">' +
        '<div class="cd-tint"></div>' +
        '<div class="cd-info"><div class="cd-sub"></div><div class="cd-title"></div></div>' +
        '<div class="cd-ring"><span class="cd-num"></span></div>' +
        '<div class="cd-hint">// PŘÍPRAVA SCÉNY</div>';
      document.body.appendChild(el);
    }
    return el;
  };
  const cancelCountdown = () => {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    const el = document.getElementById("countdown-overlay");
    if (el) el.classList.add("hidden");
  };
  const runCountdown = (partNum, done) => {
    cancelCountdown();
    try { audio.pause(); audio.currentTime = 0; } catch (e) {} // stay silent during the countdown
    const el = ensureCountdownOverlay();
    const e = EP_TITLES[partNum];
    el.querySelector(".cd-img").src = POSTERS[partNum] || POSTERS[1];
    el.querySelector(".cd-sub").textContent = e ? `// DÍL ${e.rom}` : "";
    el.querySelector(".cd-title").textContent = e ? e.t : "";
    const numEl = el.querySelector(".cd-num");
    let n = COUNTDOWN_SECONDS;
    numEl.textContent = n;
    el.classList.remove("hidden");
    const finish = () => {
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      el.classList.add("hidden");
      el.onclick = null;
      done();
    };
    el.onclick = finish; // click to skip the countdown
    countdownTimer = setInterval(() => {
      n--;
      if (n <= 0) finish();
      else numEl.textContent = n;
    }, 1000);
  };

  // --- AUDIO MODE (3D spatial equalizer) ---
  const AUDIO_META = {
    1: { rom: "I", title: "ARCHITEKT", am: "PRÁZDNOTY", who: "Ruda Müller" },
    2: { rom: "II", title: "VČELÍ MOR", am: "A NEURO-NEKRÓZA", who: "Mia Müllerová" },
    3: { rom: "III", title: "MATEŘÍ", am: "KAŠIČKA 2.0", who: "Krtek" },
  };
  let audioStageEl = null;
  const buildAudioStage = () => {
    if (audioStageEl) return audioStageEl;
    const el = document.createElement("div");
    el.id = "audio-stage";
    el.className = "ap-audio paused";
    el.style.display = "none";
    const BARS = 60;
    let rig = "";
    for (let i = 0; i < BARS; i++) {
      const a = (360 / BARS) * i;
      const t = Math.abs(Math.sin((a * Math.PI) / 180));
      const hue = Math.round(192 - 154 * t);
      const h = 30 + ((i * 37) % 11) * 9;
      const dur = (0.66 + ((i * 13) % 9) * 0.09).toFixed(2);
      const delay = (((i * 7) % 17) * 0.06).toFixed(2);
      rig +=
        `<div class="ap-eqslot" style="transform:rotateY(${a}deg) translateZ(var(--eqR))">` +
        `<div class="ap-eqbar" style="height:${h}px;animation-duration:${dur}s;animation-delay:${delay}s;` +
        `background:linear-gradient(to top,hsl(${hue} 100% 46%),hsl(${hue} 100% 78%));box-shadow:0 0 14px hsl(${hue} 100% 60% / .8)"></div>` +
        `<div class="ap-eqbar refl" style="height:${h}px;animation-duration:${dur}s;animation-delay:${delay}s;` +
        `background:linear-gradient(to bottom,hsl(${hue} 100% 50% / .55),transparent)"></div>` +
        `</div>`;
    }
    el.innerHTML =
      '<div class="ap-eqfloor"><i></i></div>' +
      '<div class="ap-eqstage"><div class="ap-eqtilt"><div class="ap-eqrig">' +
      '<div class="ap-eqcore"></div><div class="ap-eqwave"></div><div class="ap-eqwave w2"></div>' +
      rig +
      '</div></div></div>' +
      '<div class="ap-audioinfo"><span class="ap-akick" id="audio-kick"></span>' +
      '<h2 class="ap-atitle" id="audio-title"></h2><span class="ap-anarr" id="audio-narr"></span></div>' +
      '<div class="ap-astatus"><span class="ap-aled" id="audio-led"></span><span id="audio-status">Připraveno k přehrání</span></div>';
    document.body.appendChild(el);
    audioStageEl = el;
    return el;
  };
  const updateAudioStage = (partNum) => {
    if (!audioStageEl) return;
    const m = AUDIO_META[partNum] || AUDIO_META[1];
    const kick = document.getElementById("audio-kick");
    const title = document.getElementById("audio-title");
    const narr = document.getElementById("audio-narr");
    if (kick) kick.textContent = "// Audiokniha · Díl " + m.rom;
    if (title) title.innerHTML = `${m.title} <span class="am">${m.am}</span>`;
    if (narr) narr.textContent = "Čte " + m.who;
  };
  const setAudioPlaying = (playing) => {
    if (!audioStageEl) return;
    audioStageEl.classList.toggle("paused", !playing);
    const led = document.getElementById("audio-led");
    const st = document.getElementById("audio-status");
    if (led) led.classList.toggle("on", playing);
    if (st) st.textContent = playing ? "Přehrávám · prostorový zvuk" : (state.currentTime > 0 ? "Pozastaveno" : "Připraveno k přehrání");
  };
  const showAudioStage = (show) => {
    const el = buildAudioStage();
    el.style.display = show ? "block" : "none";
    if (show) { updateAudioStage(state.activePart); setAudioPlaying(state.playing); }
  };
  const playerStatus = document.getElementById("player-status") || _dummy;
  const btnSync = document.getElementById("btn-sync") || _dummy;
  const btnExport = document.getElementById("btn-export") || _dummy;
  const btnReset = document.getElementById("btn-reset") || _dummy;
  const fileAudio = document.getElementById("file-audio") || _dummy;
  const hintText = document.getElementById("hint-text") || _dummy;
  
  // Karaoke DOM elements
  const karaokeDisplay = document.getElementById("karaoke-display");
  const kPrev = karaokeDisplay ? karaokeDisplay.querySelector(".k-prev") : _dummy;
  const kCurrent = karaokeDisplay ? karaokeDisplay.querySelector(".k-current") : _dummy;
  const kNext = karaokeDisplay ? karaokeDisplay.querySelector(".k-next") : _dummy;

  const updateKaraokeDisplay = (prev, current, next) => {
    if (!kPrev || !kCurrent || !kNext) return;
    kPrev.textContent = prev || "";
    kCurrent.textContent = current || "";
    kNext.textContent = next || "";
  };
  
  const textBgVideoContainer = document.querySelector(".text-bg-video-container");
  const bgContainer = document.getElementById("bg-container");
  const bgImages = Array.from(document.querySelectorAll(".bg-image"));
  const videoBgContainer = document.getElementById("video-bg-container");

  // Dual video elements for crossfading
  const bgVideo1 = document.getElementById("bg-video-1") || document.getElementById("bg-video");
  const bgVideo2 = document.getElementById("bg-video-2");
  
  // Dual video preview elements
  const _dummyVideo = document.createElement("video");
  const prevVideo1 = document.getElementById("prev-video-1") || _dummyVideo;
  const prevVideo2 = document.getElementById("prev-video-2") || _dummyVideo;
  const previewSubtitles = document.getElementById("preview-subtitles") || _dummy;
  const previewShotId = document.getElementById("preview-shot-id") || _dummy;
  const playerVideoPreview = document.getElementById("player-video-preview") || _dummy;
  const fullscreenOverlay = document.getElementById("fullscreen-overlay");
  const fullscreenCloseBtn = document.getElementById("fullscreen-close-btn");
  const fsVideo1 = document.getElementById("fs-video-1");
  const fsVideo2 = document.getElementById("fs-video-2");
  const fullscreenSubtitles = document.getElementById("fullscreen-subtitles");
  const fullscreenShotId = document.getElementById("fullscreen-shot-id");

  let currentVideoEl = bgVideo1;
  let nextVideoEl = bgVideo2 || bgVideo1;

  let currentPrevEl = prevVideo1;
  let nextPrevEl = prevVideo2 || prevVideo1;

  let currentFsEl = fsVideo1;
  let nextFsEl = fsVideo2 || fsVideo1;

  let allParas = [];
  const tabPart1 = document.getElementById("tab-part1");
  const tabPart2 = document.getElementById("tab-part2");
  const tabPart3 = document.getElementById("tab-part3");
  
  const btnStickyPart1 = document.getElementById("btn-sticky-part1");
  const btnStickyPart2 = document.getElementById("btn-sticky-part2");
  const btnStickyPart3 = document.getElementById("btn-sticky-part3");

  const storyPart1 = document.getElementById("story-content-part1");
  const storyPart2 = document.getElementById("story-content-part2");
  const storyPart3 = document.getElementById("story-content-part3");

  const updateModeVisibility = () => {
    // Hide all story and comic content elements
    const contents = [
      storyPart1, storyPart2, storyPart3,
      document.getElementById("comic-content-part1"),
      document.getElementById("comic-content-part2"),
      document.getElementById("comic-content-part3")
    ];
    
    contents.forEach(el => {
      if (el) el.classList.add("hidden");
    });
    
    
    if (state.comicMode) {
      const activeComic = document.getElementById(`comic-content-part${state.activePart}`);
      if (activeComic) activeComic.classList.remove("hidden");
    } else {
      const activeStory = document.getElementById(`story-content-part${state.activePart}`);
      if (activeStory) activeStory.classList.remove("hidden");
    }
  };

  const setPart = (partNum, startPlaying = false) => {
    state.activePart = partNum;
    updateBarEpTitle(partNum);
    if (state.audioMode) updateAudioStage(partNum);
    
    // Reset all tabs active states
    if (tabPart1) tabPart1.classList.remove("active", "part2-active", "part3-active");
    if (tabPart2) tabPart2.classList.remove("active", "part2-active", "part3-active");
    if (tabPart3) tabPart3.classList.remove("active", "part2-active", "part3-active");
    
    if (btnStickyPart1) btnStickyPart1.classList.remove("active", "part2-active", "part3-active");
    if (btnStickyPart2) btnStickyPart2.classList.remove("active", "part2-active", "part3-active");
    if (btnStickyPart3) btnStickyPart3.classList.remove("active", "part2-active", "part3-active");
    
    // Highlight character card in hero section
    document.querySelectorAll(".character-card").forEach(card => {
      card.classList.remove("active");
      if (parseInt(card.dataset.part) === partNum) {
        card.classList.add("active");
      }
    });

    // Toggle visibility between text & comic modes
    updateModeVisibility();

    // Select appropriate poster, image, and titles based on part
    const previewPoster = document.getElementById("preview-poster");
    const previewPosterImg = document.getElementById("preview-poster-img");
    const previewPosterTitle = document.getElementById("preview-poster-title");
    const fullscreenPoster = document.getElementById("fullscreen-poster");
    const fullscreenPosterImg = document.getElementById("fullscreen-poster-img");
    const fullscreenPosterTitle = document.getElementById("fullscreen-poster-title");

    if (previewPoster) previewPoster.classList.add("active");
    if (fullscreenPoster) fullscreenPoster.classList.add("active");
    
    // Update teaser video
    const teaserVid = document.getElementById("fullscreen-teaser-video");
    if (teaserVid) {
      teaserVid.src = getVideoPath(`video/teaser_${partNum}.mp4`);
      teaserVid.play().catch(e => console.log("Teaser autoplay prevented", e));
    }
    

    if (partNum === 1) {
      document.body.classList.remove("part2-active", "part3-active");
      if (tabPart1) tabPart1.classList.add("active");
      if (btnStickyPart1) btnStickyPart1.classList.add("active");
      const pat = document.getElementById("player-archive-title"); if (pat) pat.textContent = "// AUDIO ARCHIVE — RUDA.M";
      
      if (previewPosterTitle) previewPosterTitle.textContent = "DÍL I: ARCHITEKT PRÁZDNOTY";
      if (fullscreenPosterTitle) fullscreenPosterTitle.textContent = "DÍL I: ARCHITEKT PRÁZDNOTY";
      if (previewPosterImg) previewPosterImg.src = "avatar/ruda/ruda.png";
      if (fullscreenPosterImg) fullscreenPosterImg.src = "avatar/ruda/ruda.png";
      
      paras = allParas.filter(p => parseInt(p.dataset.i) < 20);
      audio.src = "audio/dil_1.mp3";
    } else if (partNum === 2) {
      document.body.classList.remove("part3-active");
      document.body.classList.add("part2-active");
      if (tabPart2) tabPart2.classList.add("active", "part2-active");
      if (btnStickyPart2) btnStickyPart2.classList.add("active", "part2-active");
      const pat = document.getElementById("player-archive-title"); if (pat) pat.textContent = "// DECRYPTED FEED — MIA.M";
      
      if (previewPosterTitle) previewPosterTitle.textContent = "DÍL II: VČELÍ MOR A NEURO-NEKRÓZA";
      if (fullscreenPosterTitle) fullscreenPosterTitle.textContent = "DÍL II: VČELÍ MOR A NEURO-NEKRÓZA";
      if (previewPosterImg) previewPosterImg.src = "avatar/mia/mia.png";
      if (fullscreenPosterImg) fullscreenPosterImg.src = "avatar/mia/mia.png";
      
      paras = allParas.filter(p => parseInt(p.dataset.i) >= 20 && parseInt(p.dataset.i) < 32);
      audio.src = "audio/dil_2.mp3";
      
      // Show decrypted or gate
      const panel = document.getElementById("leak-panel-part2");
      const flow = document.getElementById("decrypted-flow-part2");
      if (state.decryptedPart2) {
        if (panel) panel.classList.add("hidden");
        if (flow) flow.classList.remove("hidden");
      } else {
        if (panel) panel.classList.remove("hidden");
        if (flow) flow.classList.add("hidden");
      }
    } else {
      if (storyPart3) storyPart3.classList.remove("hidden");
      document.body.classList.remove("part2-active");
      document.body.classList.add("part3-active");
      if (tabPart3) tabPart3.classList.add("active", "part3-active");
      if (btnStickyPart3) btnStickyPart3.classList.add("active", "part3-active");
      const pat = document.getElementById("player-archive-title"); if (pat) pat.textContent = "// DECRYPTED FEED — MIA.M";
      
      if (previewPosterTitle) previewPosterTitle.textContent = "DÍL III: MATEŘÍ KAŠIČKA 2.0";
      if (fullscreenPosterTitle) fullscreenPosterTitle.textContent = "DÍL III: MATEŘÍ KAŠIČKA 2.0";
      if (previewPosterImg) previewPosterImg.src = "avatar/krtek/krtek.png";
      if (fullscreenPosterImg) fullscreenPosterImg.src = "avatar/krtek/krtek.png";
      
      paras = allParas.filter(p => parseInt(p.dataset.i) >= 32);
      audio.src = "audio/dil_3.mp3";
      
      // Show decrypted or gate
      const panel = document.getElementById("leak-panel-part3");
      const flow = document.getElementById("decrypted-flow-part3");
      if (state.decryptedPart3) {
        if (panel) panel.classList.add("hidden");
        if (flow) flow.classList.remove("hidden");
      } else {
        if (panel) panel.classList.remove("hidden");
        if (flow) flow.classList.add("hidden");
      }
    }
    
    N = paras.length;
    state.curIdx = -1;
    state.duration = 0;
    state.loaded = false;
    isPlayingCustom = false;
    activeParaIdx = -1;
    subVideoIdx = 1;
    if (audio.src) {
      try {
        audio.currentTime = 0;
      } catch (e) {}
      audio.load();
    } else {
      audio.pause();
    }
    updateStatus();

    // Load cues for this part
    loadCues(partNum);

    // Panel→time timeline depends on this part's cues; rebuild lazily.
    invalidateComicTimelines();

    if (startPlaying && audio.src) {
      // Remove any pending play handler from a previous (rapid) part switch
      if (pendingPlayHandler) {
        audio.removeEventListener("canplay", pendingPlayHandler);
        pendingPlayHandler = null;
      }

      const startFromBeginning = () => {
        try {
          audio.currentTime = 0;
        } catch (e) {}
        audio.play()
          .then(() => updateStatus())
          .catch(e => console.warn("Autoplay after swap failed:", e));
      };

      // If the audio is already buffered enough (e.g. cached), play immediately;
      // otherwise wait for canplay. Avoids the race where canplay fires before
      // the listener is attached and playback never starts.
      const beginPlayback = () => {
        if (audio.readyState >= 2 /* HAVE_CURRENT_DATA */) {
          startFromBeginning();
        } else {
          pendingPlayHandler = () => {
            audio.removeEventListener("canplay", pendingPlayHandler);
            pendingPlayHandler = null;
            startFromBeginning();
          };
          audio.addEventListener("canplay", pendingPlayHandler);
        }
      };

      if (state.comicMode || state.fullscreenMode) {
        // Comic & film open on a static poster with a ~7s countdown before the
        // first scene (and the audio) begins.
        if (state.comicMode) scrollComicToStart(partNum);
        runCountdown(partNum, beginPlayback);
      } else {
        beginPlayback();
      }
    }
  };

  const loadCues = (partNum) => {
    let stored = null;
    try {
      const s = localStorage.getItem(`ruda_cues_v3_part${partNum}`);
      if (s) stored = JSON.parse(s);
    } catch (e) {
      console.warn("Could not parse cues from localStorage", e);
    }

    const defaultCues = partNum === 1 ? PART1_CUES : (partNum === 2 ? PART2_CUES : PART3_CUES);
    const partLength = partNum === 1 ? 20 : (partNum === 2 ? 12 : 15);

    if (stored && stored.length === partLength && stored.some(x => typeof x === "number")) {
      cues = stored;
      setHint("Časování načteno z lokální paměti.");
    } else {
      cues = [...defaultCues];
      setHint("Načteno přesné výchozí časování.");
    }
  };

  const initDraggablePlayer = () => {
    const playerWrapper = document.querySelector(".player-wrapper");
    const playerHeader = document.querySelector(".player-header");
    if (!playerWrapper || !playerHeader) return;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    // Add drag grip
    const grip = document.createElement("span");
    grip.className = "drag-grip";
    grip.textContent = "▤";
    grip.title = "Přetáhněte přehrávač";
    playerHeader.insertBefore(grip, playerHeader.firstChild);

    const dragMouseDown = (e) => {
      // Don't drag if clicking buttons or elements inside header
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest("label") || e.target.closest("input")) return;
      
      e = e || window.event;
      if (e.button !== 0 && e.type !== 'touchstart') return;

      // Disable default text selection/scrolling during drag
      e.preventDefault();

      pos3 = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      pos4 = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

      if (!playerWrapper.classList.contains("floating-player")) {
        const rect = playerWrapper.getBoundingClientRect();
        playerWrapper.style.width = `${rect.width}px`;
        playerWrapper.style.position = "fixed";
        playerWrapper.style.top = `${rect.top}px`;
        playerWrapper.style.left = `${rect.left}px`;
        playerWrapper.style.margin = "0";
        playerWrapper.classList.add("floating-player");
      }

      document.addEventListener("pointermove", elementDrag, { passive: false });
      document.addEventListener("pointerup", closeDragElement);
    };

    const elementDrag = (e) => {
      e = e || window.event;
      e.preventDefault();

      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      pos1 = pos3 - clientX;
      pos2 = pos4 - clientY;
      pos3 = clientX;
      pos4 = clientY;

      const newTop = playerWrapper.offsetTop - pos2;
      const newLeft = playerWrapper.offsetLeft - pos1;

      const margin = 10;
      const maxTop = window.innerHeight - playerWrapper.offsetHeight - margin;
      const maxLeft = window.innerWidth - playerWrapper.offsetWidth - margin;

      playerWrapper.style.top = `${Math.max(margin, Math.min(maxTop, newTop))}px`;
      playerWrapper.style.left = `${Math.max(margin, Math.min(maxLeft, newLeft))}px`;
    };

    const closeDragElement = () => {
      document.removeEventListener("pointermove", elementDrag);
      document.removeEventListener("pointerup", closeDragElement);
    };

    playerHeader.addEventListener("pointerdown", dragMouseDown);
  };

  // --- COMIC STRIP SETUP ---
  const COMIC_TITLES = {
    1: { img: "avatar/ruda/ruda.png",   sub: "// DÍL I",   title: "ARCHITEKT PRÁZDNOTY" },
    2: { img: "avatar/mia/mia.png",     sub: "// DÍL II",  title: "VČELÍ MOR A NEURO-NEKRÓZA" },
    3: { img: "avatar/krtek/krtek.png", sub: "// DÍL III", title: "MATEŘÍ KAŠIČKA 2.0" }
  };

  const setupComicStrip = () => {
    // Dynamically populate all comic panels with their exact sentence text
    const populateComicText = () => {
      document.querySelectorAll(".comic-panel").forEach(panel => {
        const paraIdx = parseInt(panel.dataset.i);
        const sentIdx = parseInt(panel.dataset.sentence);
        const paraEl = document.querySelector(`.story-content [data-i="${paraIdx}"]`);
        
        if (paraEl) {
          // Clone the element to remove dropcap span if we want pure text or just use textContent
          let clone = paraEl.cloneNode(true);
          // Get raw text
          let rawText = clone.textContent || clone.innerText || "";
          
          // Split into sentences using punctuation followed by space or end of string
          let sentences = rawText.match(/[^.?!]+[.?!]+(?=\s|$)|[^.?!]+$/g);
          if (!sentences) sentences = [rawText];
          sentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
          
          if (sentIdx < sentences.length) {
            let sText = sentences[sentIdx];
            // Remove outer quotes if it's going to be in a speech bubble, or leave them
            // The python script might have added „ “ around the speech-text
            
            const speechTextEl = panel.querySelector(".speech-text");
            const captionPEl = panel.querySelector(".comic-caption p");
            
            if (speechTextEl) {
              speechTextEl.textContent = sText;
            } else if (captionPEl) {
              captionPEl.textContent = sText;
            }
          }
        }
      });
    };

    populateComicText();

    [1, 2, 3].forEach(p => {
      const grid = document.querySelector(`#comic-content-part${p} .comic-grid`);
      if (!grid) return;

      // Group the part's panels into vertical columns of a random 1–3 images,
      // each column filling the window height (like the old vertical page).
      if (!grid.querySelector(".comic-col")) {
        const panels = Array.from(grid.querySelectorAll(".comic-panel"));
        let i = 0;
        while (i < panels.length) {
          const remaining = panels.length - i;
          const size = Math.min(1 + Math.floor(Math.random() * 3), remaining); // 1..3
          const col = document.createElement("div");
          col.className = `comic-col cols-${size}`;
          for (let k = 0; k < size; k++) col.appendChild(panels[i + k]);
          grid.appendChild(col); // title card stays first; columns append in order
          i += size;
        }
      }

      // Prepend an intro title card (built from the part's poster + title)
      if (!grid.querySelector(".comic-title-card")) {
        const t = COMIC_TITLES[p];
        const card = document.createElement("div");
        card.className = "comic-title-card";
        card.innerHTML =
          `<img class="ctc-img" src="${t.img}" alt="">` +
          `<div class="ctc-overlay"></div>` +
          `<div class="ctc-sub">${t.sub}</div>` +
          `<div class="ctc-title">${t.title}</div>`;
        grid.insertBefore(card, grid.firstChild);
      }

      // Desktop only: let a normal mouse wheel move the horizontal strip left↔right.
      // On mobile the strip scrolls vertically, so leave native scrolling alone.
      grid.addEventListener("wheel", (e) => {
        if (!state.comicMode) return;
        if (window.matchMedia("(max-width: 768px)").matches) return; // vertical layout
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // let native horizontal scroll pass
        e.preventDefault();
        grid.scrollLeft += e.deltaY;
        lastUserScrollTime = Date.now();
      }, { passive: false });
    });
  };

  // --- INITIALIZATION ---
  const init = () => {
    // 1. Gather paragraph elements
    allParas = Array.from(document.querySelectorAll(".story-content [data-i]"));
    allParas.sort((a, b) => parseInt(a.dataset.i) - parseInt(b.dataset.i));

    // 2. Wrap words in paragraphs for karaoke
    allParas.forEach(p => {
      wrapWords(p);
    });

    // 3. Build the horizontal comic strip (intro title cards + wheel scrolling)
    setupComicStrip();

    // Initialize Part 1
    setPart(1, false);

    // 4. Attach paragraph click listeners (for calibration)
    allParas.forEach(p => {
      p.addEventListener("click", () => {
        // Find current paragraph index in active part
        const activeIdx = paras.indexOf(p);
        if (activeIdx !== -1) {
          onParaClick(activeIdx);
        }
      });
    });

    // 5. Setup video background rotation (DISABLED - BG rotation removed)
    // startVideoRotation();

    // 6. Setup audio listeners
    setupAudioListeners();

    // 7. Setup UI controls listeners
    setupUIListeners();

    // 8. Setup characters cards click switch
    document.querySelectorAll(".character-card").forEach(card => {
      card.addEventListener("click", () => {
        const partNum = parseInt(card.dataset.part);

        // In comic mode every part plays the same way — skip the text-mode
        // decryption gate so parts 2 & 3 start their comic directly.
        if (!state.comicMode) {
          // Check decryption status and run decryption animation automatically if locked
          if (partNum === 2 && !state.decryptedPart2) {
            const panel = document.getElementById("leak-panel-part2");
            if (panel) panel.scrollIntoView({ behavior: "smooth" });
            runDecryptionAnimation(2);
            return;
          }
          if (partNum === 3 && !state.decryptedPart3) {
            const panel = document.getElementById("leak-panel-part3");
            if (panel) panel.scrollIntoView({ behavior: "smooth" });
            runDecryptionAnimation(3);
            return;
          }
        }

        setPart(partNum, true);
      });
    });

    // Setup manual scroll override listeners
    const registerUserInteraction = () => {
      lastUserScrollTime = Date.now();
    };
    window.addEventListener("wheel", registerUserInteraction, { passive: true });
    window.addEventListener("touchmove", registerUserInteraction, { passive: true });
    window.addEventListener("mousedown", registerUserInteraction, { passive: true });
    window.addEventListener("keydown", (e) => {
      const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", "Home", "End"];
      if (scrollKeys.includes(e.key)) {
        registerUserInteraction();
      }
    });

    // Obousměrný sdílený timeline: ruční scroll seekuje audio (text = okno,
    // komiks = strip). Seek se provede jen po user-intent (INTERACTION_WINDOW).
    window.addEventListener("scroll", handleUserScrollSeek, { passive: true });
    document.querySelectorAll(".comic-grid").forEach(g =>
      g.addEventListener("scroll", handleUserScrollSeek, { passive: true }));

    // Wheel = scrub audio timeline by sentence, but only in FILM and AUDIO modes.
    // TEXT keeps native scrolling; COMIC keeps its own strip-scroll handler.
    let lastCueScrub = 0;
    window.addEventListener("wheel", (e) => {
      if (!state.audioMode && !state.fullscreenMode) return;
      if (!cues || !(state.duration > 0)) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastCueScrub < 110) return; // one step per wheel notch
      lastCueScrub = now;
      scrubByCue(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // Setup mode switcher listeners
    const btnModeText = document.getElementById("btn-mode-text");
    const btnModeComic = document.getElementById("btn-mode-comic");
    const btnModeMovie = document.getElementById("btn-mode-movie");
    const btnModeAudio = document.getElementById("btn-mode-audio");

    const setActiveModeUI = (mode) => {
      const playerPreview = document.getElementById("player-video-preview");
      const playerWrapperEl = document.querySelector(".player-wrapper");
      // reset all mode buttons; the active branch re-adds its own
      [btnModeText, btnModeComic, btnModeMovie, btnModeAudio].forEach(b => b?.classList.remove("active"));
      state.audioMode = (mode === "audio");
      if (mode !== "audio") showAudioStage(false);

      if (mode === "text") {
        state.comicMode = false;
        document.body.classList.remove("comic-fs");
        if (state.fullscreenMode) closeFullscreenOverlay(); // leave film when switching live
        btnModeText?.classList.add("active");
        if (playerPreview) playerPreview.style.display = "flex"; // Show video monitor in text mode
        if (playerWrapperEl) playerWrapperEl.style.display = "flex"; // Ensure dashboard is visible in text mode
        updateModeVisibility();
        highlightParagraph(state.curIdx);
        invalidateComicTimelines(); // přebuduj cue-anchored kotvy pro textový scroll
      } else if (mode === "comic") {
        state.comicMode = true;
        document.body.classList.add("comic-fs"); // fullscreen comic playback
        if (state.fullscreenMode) closeFullscreenOverlay(); // leave film when switching live
        btnModeComic?.classList.add("active");
        if (playerPreview) playerPreview.style.display = "none"; // Hide preview monitor since strip is fullscreen
        if (playerWrapperEl) playerWrapperEl.style.display = "none"; // Hide dashboard panel in comic mode
        updateModeVisibility();
        highlightParagraph(state.curIdx);
        invalidateComicTimelines(); // recompute panel offsets in the new layout
      } else if (mode === "movie") {
        state.comicMode = false;
        document.body.classList.remove("comic-fs");
        btnModeMovie?.classList.add("active");
        if (playerPreview) playerPreview.style.display = "flex";
        if (playerWrapperEl) playerWrapperEl.style.display = "flex"; // Show player dashboard panel during movie mode
        openFullscreenOverlay();
      } else if (mode === "audio") {
        state.comicMode = false;
        document.body.classList.remove("comic-fs");
        if (state.fullscreenMode) closeFullscreenOverlay(); // leave film when switching live
        btnModeAudio?.classList.add("active");
        if (playerPreview) playerPreview.style.display = "none";
        if (playerWrapperEl) playerWrapperEl.style.display = "none";
        showAudioStage(true); // 3D spatial equalizer
      }
    };

    if (btnModeText) btnModeText.addEventListener("click", () => setActiveModeUI("text"));
    if (btnModeComic) btnModeComic.addEventListener("click", () => setActiveModeUI("comic"));
    if (btnModeMovie) btnModeMovie.addEventListener("click", () => setActiveModeUI("movie"));
    if (btnModeAudio) btnModeAudio.addEventListener("click", () => setActiveModeUI("audio"));

    // Sticky Part Switcher listeners
    const handleStickyPartClick = (partNum) => {
      if (!state.comicMode && !state.fullscreenMode) {
        if (partNum === 2 && !state.decryptedPart2) {
          const panel = document.getElementById("leak-panel-part2");
          if (panel) panel.scrollIntoView({ behavior: "smooth" });
          runDecryptionAnimation(2);
          return;
        }
        if (partNum === 3 && !state.decryptedPart3) {
          const panel = document.getElementById("leak-panel-part3");
          if (panel) panel.scrollIntoView({ behavior: "smooth" });
          runDecryptionAnimation(3);
          return;
        }
      }
      setPart(partNum, true);
    };

    if (btnStickyPart1) btnStickyPart1.addEventListener("click", () => handleStickyPartClick(1));
    if (btnStickyPart2) btnStickyPart2.addEventListener("click", () => handleStickyPartClick(2));
    if (btnStickyPart3) btnStickyPart3.addEventListener("click", () => handleStickyPartClick(3));

    // Close fullscreen with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.fullscreenMode) {
        closeFullscreenOverlay();
      }
    });

    // Setup intro selector overlay clicks
    const introOverlay = document.getElementById("intro-selector-overlay");
    let autoSelectTimeout;
    
    const startAutoSelect = () => {
      if (autoSelectTimeout) clearTimeout(autoSelectTimeout);
      autoSelectTimeout = setTimeout(() => {
        if (introOverlay && !introOverlay.classList.contains("hidden")) {
          // find movie card and simulate click or directly call selectMode logic
          const movieCard = introOverlay.querySelector(".movie-card");
          if (movieCard) movieCard.click();
        }
      }, 10000);
    };

    if (introOverlay) {
      const selectMode = (mode) => {
        if (autoSelectTimeout) clearTimeout(autoSelectTimeout);
        // Apply selected mode
        setActiveModeUI(mode);
        
        // Hide welcome screen with fade-out
        introOverlay.classList.add("hidden");
        setTimeout(() => {
          introOverlay.style.display = "none";
        }, 500);

        // Force play Part 1 from beginning on fresh startup
        setPart(1, true);
      };

      const cards = introOverlay.querySelectorAll(".version-card");
      cards.forEach(card => {
        card.addEventListener("click", () => {
          selectMode(card.dataset.mode);
        });
      });

      // NOTE: no auto-select — the start screen waits for the user to pick a version.
      // (The previous 10s auto-select silently switched to FILM.)
    }

    // Reset back to welcome screen selector
    const btnWelcomeReset = document.getElementById("btn-welcome-reset");
    if (btnWelcomeReset) {
      btnWelcomeReset.addEventListener("click", () => {
        audio.pause();
        audio.currentTime = 0;
        state.playing = false;
        playIcon.textContent = "▶";
        if (playBtnWrapper) playBtnWrapper.classList.remove("playing");
        
        // Return to Part 1
        setPart(1, false);

        if (introOverlay) {
          introOverlay.style.display = "flex";
          setTimeout(() => {
            introOverlay.classList.remove("hidden");
            startAutoSelect();
          }, 50);
        }
      });
    }

    // 9. Initialize Draggable player panel
    initDraggablePlayer();
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
        invalidateComicTimelines(); // duration je známá → přesné kotvy (zvl. poslední segment)

        // Autoplay attempt
        if (!state.autoplayAttempted) {
          state.autoplayAttempted = true;
          attemptAutoplay();
        }
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
      setBarPlayIcon(true);
      setAudioPlaying(true);
      if (playBtnWrapper) playBtnWrapper.classList.add("playing");
      updateStatus();
      
      // Sync video state
      if (currentVideoEl) currentVideoEl.play().catch(() => {});
      if (currentPrevEl) currentPrevEl.play().catch(() => {});
    });

    audio.addEventListener("pause", () => {
      state.playing = false;
      playIcon.textContent = "▶";
      setBarPlayIcon(false);
      setAudioPlaying(false);
      if (playBtnWrapper) playBtnWrapper.classList.remove("playing");
      updateStatus();
    });

    audio.addEventListener("ended", () => {
      // Automatic progression to next part
      if (state.activePart === 1) {
        console.log("Díl I ended, decrypting/switching to Díl II");
        state.decryptedPart2 = true;
        localStorage.setItem("decrypted_part2", "true");
        setPart(2, true);
      } else if (state.activePart === 2) {
        console.log("Díl II ended, decrypting/switching to Díl III");
        state.decryptedPart3 = true;
        localStorage.setItem("decrypted_part3", "true");
        setPart(3, true);
      } else {
        // Last part finished, reset to standby
        state.playing = false;
        playIcon.textContent = "▶";
        if (playBtnWrapper) playBtnWrapper.classList.remove("playing");
        audio.currentTime = 0;
        updateStatus();
      }
    });

    // Check if metadata is already loaded
    if (audio.readyState >= 1) {
      onMeta();
    }
  };

  const attemptAutoplay = () => {
    audio.play()
      .then(() => {
        console.log("Autoplay successful");
      })
      .catch(err => {
        console.warn("Autoplay blocked, waiting for interaction:", err);
        setHint("Klikněte kamkoli pro spuštění audio-příběhu.");
        
        const startOnInteraction = () => {
          audio.play()
            .then(() => {
              document.removeEventListener("click", startOnInteraction);
              document.removeEventListener("touchstart", startOnInteraction);
              setHint(""); // Clear helper hint
            })
            .catch(e => console.error("Play on interaction failed:", e));
        };
        
        document.addEventListener("click", startOnInteraction);
        document.addEventListener("touchstart", startOnInteraction);
      });
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

  // Cinematic subtitles: show the CURRENT SENTENCE of the active paragraph with
  // word-by-word karaoke highlighting (same idea as the text version, but condensed).
  const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const SENTENCE_END = /[.!?…]["'»“”)\]]*$/;

  const setSubtitles = (content, asHtml) => {
    // Wrap word spans in a single centered line so the flex box centers the whole
    // sentence as one block (otherwise each <span> becomes its own flex item).
    const html = asHtml ? `<span class="cin-line">${content}</span>` : null;
    if (previewSubtitles) {
      if (asHtml) previewSubtitles.innerHTML = html;
      else previewSubtitles.textContent = content;
    }
    if (fullscreenSubtitles) {
      if (asHtml) fullscreenSubtitles.innerHTML = html;
      else fullscreenSubtitles.textContent = content;
    }
  };

  const updateCinemaSubtitle = (pIdx, displayTime) => {
    if (pIdx < 0 || !paras[pIdx] || !cues) {
      if (previewSubtitles) previewSubtitles.style.color = "var(--muted)";
      setSubtitles(state.playing ? "// FEED ACTIVE" : "// SYSTEM STANDBY", false);
      return;
    }
    if (previewSubtitles) previewSubtitles.style.color = "var(--cyan)";

    const words = Array.from(paras[pIdx].querySelectorAll(".word"))
      .map(w => w.textContent.trim())
      .filter(Boolean);
    if (!words.length) { setSubtitles(paras[pIdx].textContent.trim(), false); return; }

    // Progress within the paragraph → active word index
    const tStart = cues[pIdx];
    const tEnd = (pIdx < N - 1 && cues[pIdx + 1] != null) ? cues[pIdx + 1] : state.duration;
    const dur = Math.max(0.1, tEnd - tStart);
    const progress = Math.max(0, Math.min(1, (displayTime - tStart) / dur));
    const activeWordIdx = Math.max(0, Math.min(words.length - 1, Math.floor(progress * words.length)));

    // Split the paragraph into sentences (lists of word indices)
    const sentences = [];
    let cur = [];
    words.forEach((w, i) => {
      cur.push(i);
      if (SENTENCE_END.test(w)) { sentences.push(cur); cur = []; }
    });
    if (cur.length) sentences.push(cur);

    // The sentence that contains the active word
    const sent = sentences.find(s => activeWordIdx >= s[0] && activeWordIdx <= s[s.length - 1])
      || sentences[sentences.length - 1];

    const html = sent
      .map(i => `<span class="cin-word${i <= activeWordIdx ? " read" : ""}">${escapeHtml(words[i])}</span>`)
      .join(" ");
    setSubtitles(html, true);
  };

  const onTimeUpdate = () => {
    // 1. Update progress bar
    if (state.duration) {
      const pct = (state.currentTime / state.duration) * 100;
      progressFill.style.width = `${pct}%`;
      timeCurrent.textContent = formatTime(state.currentTime);
      timeDuration.textContent = formatTime(state.duration);
      // TRON top-bar transport
      if (barFill) barFill.style.width = `${pct}%`;
      if (barKnob) barKnob.style.left = `${pct}%`;
      if (barTimeCur) barTimeCur.textContent = formatTime(state.currentTime);
      if (barTimeDur) barTimeDur.textContent = " / " + formatTime(state.duration);
    }

    // Apply offset to display time (e.g. 0.4s delay) when not in calibration mode
    // to align visual highlighting with audio playback latency
    const displayTime = state.calibMode ? state.currentTime : Math.max(0, state.currentTime - 0.4);

    // 2. Identify active block index
    const activeIdx = getActiveIndex(displayTime);
    if (activeIdx !== state.curIdx) {
      state.curIdx = activeIdx;
      
      // Trigger custom paragraph preview video loading
      if (activeIdx !== -1) {
        // Hide initial poster overlays when video playback sync begins (only for parts with videos: 1 and 2)
        const previewPoster = document.getElementById("preview-poster");
        const fullscreenPoster = document.getElementById("fullscreen-poster");
        if (previewPoster) previewPoster.classList.remove("active");
        if (fullscreenPoster) fullscreenPoster.classList.remove("active");

        startParagraphVideoChain(state.activePart, activeIdx);
      } else {
        isPlayingCustom = false;
      }
    }

    // Update cinematic subtitles every frame (sentence-by-sentence + word karaoke)
    updateCinemaSubtitle(activeIdx, displayTime);

    // Always run highlight update (including comic panels inside paragraphs)
    highlightParagraph(activeIdx);

    // 3. Karaoke highlight inside the active paragraph
    highlightWords(activeIdx, displayTime);
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

  // Step the audio timeline by one sentence/paragraph cue.
  // FILM + AUDIO modes drive everything off audio time, so the mouse wheel
  // jumps audio.currentTime to the next/previous cue (dir: +1 fwd, -1 back).
  const scrubByCue = (dir) => {
    if (!cues || !(state.duration > 0)) return;
    const times = [];
    for (let i = 0; i < N; i++) if (cues[i] != null) times.push(cues[i]);
    if (!times.length) return;
    times.sort((a, b) => a - b);
    const t = audio.currentTime;
    let target;
    if (dir > 0) {
      target = times.find(x => x > t + 0.05);
      if (target == null) target = state.duration;
    } else {
      // back: restart the current sentence if we're well into it, else go prev
      const prev = [...times].reverse().find(x => x < t - 0.4);
      target = prev != null ? prev : 0;
    }
    audio.currentTime = Math.max(0, Math.min(state.duration, target));
    state.curIdx = -1;          // force re-highlight on next frame
    state.currentTime = audio.currentTime;
    onTimeUpdate();             // sync slider/scene immediately (works while paused)
  };

  // --- KARAOKE WORD HIGHLIGHT ---
  const highlightWords = (pIdx, curTime) => {
    if (pIdx < 0 || !cues) {
      updateKaraokeDisplay("", "PŘIPRAVENO", "");
      return;
    }
    
    const pEl = paras[pIdx];
    if (!pEl) {
      updateKaraokeDisplay("", "PŘIPRAVENO", "");
      return;
    }
    
    const tStart = cues[pIdx];
    const tEnd = (pIdx < N - 1 && cues[pIdx + 1] != null) ? cues[pIdx + 1] : state.duration;
    const duration = tEnd - tStart;
    
    if (duration <= 0) return;
    
    const progress = Math.max(0, Math.min(1, (curTime - tStart) / duration));
    const words = pEl.querySelectorAll(".word");
    const wordsCount = words.length;
    
    if (wordsCount === 0) {
      updateKaraokeDisplay("", "", "");
      return;
    }
    
    // Estimate active word index proportionally
    const activeWordIdx = Math.max(0, Math.min(wordsCount - 1, Math.floor(progress * wordsCount)));
    
    words.forEach((word, wIdx) => {
      if (wIdx <= activeWordIdx) {
        word.classList.add("read");
      } else {
        word.classList.remove("read");
      }
    });

    // Update 3-word karaoke window
    const currentWord = words[activeWordIdx].textContent.trim();
    
    let prevWord = "";
    if (activeWordIdx > 0) {
      prevWord = words[activeWordIdx - 1].textContent.trim();
    } else if (pIdx > 0) {
      const prevParagraphWords = paras[pIdx - 1].querySelectorAll(".word");
      if (prevParagraphWords.length > 0) {
        prevWord = prevParagraphWords[prevParagraphWords.length - 1].textContent.trim();
      }
    }
    
    let nextWord = "";
    if (activeWordIdx < wordsCount - 1) {
      nextWord = words[activeWordIdx + 1].textContent.trim();
    } else if (pIdx < N - 1) {
      const nextParagraphWords = paras[pIdx + 1].querySelectorAll(".word");
      if (nextParagraphWords.length > 0) {
        nextWord = nextParagraphWords[0].textContent.trim();
      }
    }
    
    updateKaraokeDisplay(prevWord, currentWord, nextWord);
  };

  // --- TRANSCRIPT VISUALS ---
  const highlightParagraph = (idx) => {
    // 1. Text mode highlighting
    paras.forEach((p, i) => {
      const on = i === idx;
      p.classList.toggle("active", on);
      // Plynulé sledování scrollu řeší syncScrollTick (cue-anchored follow),
      // zde jen značíme aktivní odstavec.

      // Handle non-active paragraphs clean up of read words
      if (!on) {
        p.querySelectorAll(".word").forEach(w => w.classList.remove("read"));
      }
    });

    // 2. Comic mode highlighting
    const activeComicGrid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
    if (activeComicGrid) {
      const allPanels = activeComicGrid.querySelectorAll(".comic-panel");
      allPanels.forEach(panel => panel.classList.remove("active"));
    }

    if (idx !== -1 && state.comicMode) {
      // Panels carry the GLOBAL paragraph id (data-i 20..31 for part 2, etc.),
      // while idx is the LOCAL paragraph index within the part — map idx → data-i,
      // otherwise parts 2 & 3 never match any panel (this is why they "didn't run").
      const di = paras[idx] ? paras[idx].dataset.i : idx;
      const matchingPanels = document.querySelectorAll(`#comic-content-part${state.activePart} .comic-panel[data-i="${di}"]`);
      if (matchingPanels.length > 0) {
        const displayTime = state.calibMode ? state.currentTime : Math.max(0, state.currentTime - 0.4);
        const tStart = cues[idx];
        const tEnd = (idx < N - 1 && cues[idx + 1] != null) ? cues[idx + 1] : state.duration;
        const pDuration = Math.max(0.1, tEnd - tStart);
        const progress = Math.max(0, Math.min(1, (displayTime - tStart) / pDuration));

        // Proportional index
        const activePanelIdx = Math.max(0, Math.min(matchingPanels.length - 1, Math.floor(progress * matchingPanels.length)));

        const activePanel = matchingPanels[activePanelIdx];
        if (activePanel) {
          activePanel.classList.add("active");
          // Horizontal scrolling is driven continuously by the rAF loop
          // (comicScrollTick), so we only need to mark the active panel here.
        }
      }
    }
  };

  const AUTO_SCROLL_INACTIVITY_MS = 5000;

  // --- HORIZONTAL COMIC AUTO-SCROLL (continuous pursuit) ---
  // The rAF loop continuously eases the scroll position toward the center
  // of the currently active panel, speeding up or slowing down dynamically.
  let comicRAF = null;

  // On mobile the comic flows vertically (scroll down); on desktop horizontally.
  const isComicVertical = () => window.matchMedia("(max-width: 768px)").matches;

  const centerOffsetFor = (grid, el) =>
    isComicVertical()
      ? Math.max(0, el.offsetTop + el.clientHeight / 2 - grid.clientHeight / 2)
      : Math.max(0, el.offsetLeft + el.clientWidth / 2 - grid.clientWidth / 2);

  // ===== CUE-ANCHORED SYNC (obousměrný sdílený timeline) =====
  // Pro každý prvek (odstavec / panel) kotva { pos, t }: pos = scroll offset,
  // který prvek vycentruje; t = jeho cue čas. Mezi kotvami se lineárně
  // interpoluje, takže přehrávání řídí scroll a ruční scroll řídí čas audia.
  let syncAnchors = { text: [], comic: [] };

  const buildSyncAnchors = () => {
    const text = [];
    const comic = [];

    // --- TEXT: jedna kotva na odstavec (vertikální vycentrování) ---
    if (paras && paras.length) {
      const vh = window.innerHeight;
      paras.forEach((el, i) => {
        if (!cues || cues[i] == null) return;
        const rect = el.getBoundingClientRect();
        const docTop = rect.top + window.scrollY;
        const pos = Math.max(0, docTop + el.offsetHeight / 2 - vh / 2);
        text.push({ pos, t: cues[i] });
      });
      text.sort((a, b) => a.t - b.t);
    }

    // --- KOMIKS: jedna kotva na panel ---
    const grid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
    if (grid && cues && paras.length) {
      // mapa globální data-i → lokální index (cues jsou indexované lokálně)
      const localOf = {};
      paras.forEach((p, i) => { localOf[p.dataset.i] = i; });
      const panels = Array.from(grid.querySelectorAll(".comic-panel"));
      // počet panelů na odstavec (pro proporční rozdělení času)
      const counts = {};
      panels.forEach(p => { counts[p.dataset.i] = (counts[p.dataset.i] || 0) + 1; });
      panels.forEach(panel => {
        const di = panel.dataset.i;
        const li = localOf[di];
        if (li == null || cues[li] == null) return;
        const s = parseInt(panel.dataset.sentence) || 0;
        const tStart = cues[li];
        const tEnd = (li < N - 1 && cues[li + 1] != null) ? cues[li + 1] : (state.duration || tStart + 4);
        const count = counts[di] || 1;
        const t = tStart + (s / count) * (tEnd - tStart);
        comic.push({ pos: centerOffsetFor(grid, panel), t });
      });
      comic.sort((a, b) => a.t - b.t);
    }

    syncAnchors = { text, comic };
  };

  // Piecewise-lineární interpolace mezi kotvami (kotvy seřazené dle t).
  const timeToPos = (t, anchors) => {
    if (!anchors || !anchors.length) return null;
    if (t <= anchors[0].t) return anchors[0].pos;
    if (t >= anchors[anchors.length - 1].t) return anchors[anchors.length - 1].pos;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = b.t - a.t;
        const f = span > 0 ? (t - a.t) / span : 0;
        return a.pos + f * (b.pos - a.pos);
      }
    }
    return anchors[anchors.length - 1].pos;
  };

  const posToTime = (pos, anchors) => {
    if (!anchors || !anchors.length) return null;
    if (pos <= anchors[0].pos) return anchors[0].t;
    if (pos >= anchors[anchors.length - 1].pos) return anchors[anchors.length - 1].t;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (pos >= a.pos && pos <= b.pos) {
        const span = b.pos - a.pos;
        const f = span > 0 ? (pos - a.pos) / span : 0;
        return a.t + f * (b.t - a.t);
      }
    }
    return anchors[anchors.length - 1].t;
  };

  // Debounced rebuild (po změně dílu / módu / layoutu). Zachovává jméno
  // volané z setPart, resize i přepnutí komiksu.
  let anchorRebuildRAF = null;
  const invalidateComicTimelines = () => {
    if (anchorRebuildRAF) cancelAnimationFrame(anchorRebuildRAF);
    anchorRebuildRAF = requestAnimationFrame(() => {
      anchorRebuildRAF = null;
      buildSyncAnchors();
    });
  };

  // Okno (ms), po které se ruční scroll považuje za záměr → seek audia.
  const INTERACTION_WINDOW = 700;

  // Ruční scroll → seek audio (rAF-throttle). Programmatický follow scroll
  // se nezachytí, protože ten běží jen mimo INTERACTION_WINDOW/cooldown.
  let seekRafPending = false;
  const handleUserScrollSeek = () => {
    if (seekRafPending) return;
    seekRafPending = true;
    requestAnimationFrame(() => {
      seekRafPending = false;
      if (state.calibMode || state.fullscreenMode || state.audioMode) return;
      if (!state.duration) return;
      if (Date.now() - lastUserScrollTime > INTERACTION_WINDOW) return; // jen na user-intent
      let pos, anchors;
      if (state.comicMode) {
        const grid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
        if (!grid) return;
        pos = isComicVertical() ? grid.scrollTop : grid.scrollLeft;
        anchors = syncAnchors.comic;
      } else {
        pos = window.scrollY;
        anchors = syncAnchors.text;
      }
      const t = posToTime(pos, anchors);
      if (t != null && isFinite(t)) {
        audio.currentTime = Math.max(0, Math.min(state.duration, t));
      }
    });
  };

  // Unifikované plynulé sledování: přehrávání eased-scrolluje text (vertikálně,
  // okno) i komiks (horizontálně/vertikálně, strip) na pozici odpovídající
  // aktuálnímu času audia (timeToPos). Běží jen při přehrávání a mimo
  // cooldown po ručním scrollu, takže se s ručním seekem nepere.
  const syncScrollTick = () => {
    comicRAF = requestAnimationFrame(syncScrollTick);
    if (!state.playing || state.calibMode || state.fullscreenMode || state.audioMode) return;
    // Respect manual scrolling — pause the auto-glide for a while after interaction.
    if (Date.now() - lastUserScrollTime < AUTO_SCROLL_INACTIVITY_MS) return;

    const displayTime = Math.max(0, state.currentTime - 0.4);

    if (state.comicMode) {
      const grid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
      if (!grid) return;
      const target = timeToPos(displayTime, syncAnchors.comic);
      if (target == null) return;
      const vertical = isComicVertical();
      const current = vertical ? grid.scrollTop : grid.scrollLeft;
      const delta = target - current;
      if (Math.abs(delta) < 0.5) {
        if (vertical) grid.scrollTop = target; else grid.scrollLeft = target;
        return;
      }
      const next = current + delta * 0.2;
      if (vertical) grid.scrollTop = next; else grid.scrollLeft = next;
    } else {
      const target = timeToPos(displayTime, syncAnchors.text);
      if (target == null) return;
      const current = window.scrollY;
      const delta = target - current;
      if (Math.abs(delta) < 0.5) { window.scrollTo(0, target); return; }
      window.scrollTo(0, current + delta * 0.2);
    }
  };
  comicRAF = requestAnimationFrame(syncScrollTick);

  window.addEventListener("resize", invalidateComicTimelines);

  // Scroll a part's strip to its intro title card for the 3s pause.
  const scrollComicToStart = (partNum) => {
    const grid = document.querySelector(`#comic-content-part${partNum} .comic-grid`);
    if (!grid) return;
    const title = grid.querySelector(".comic-title-card");
    const offset = title ? centerOffsetFor(grid, title) : 0;
    if (isComicVertical()) grid.scrollTo({ top: offset, behavior: "smooth" });
    else grid.scrollTo({ left: offset, behavior: "smooth" });
  };

  const scrollToParagraph = (idx) => {
    const el = paras[idx];
    if (!el) return;
    if (Date.now() - lastUserScrollTime < AUTO_SCROLL_INACTIVITY_MS) {
      return; // Respect user manual scrolling
    }
    
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
  let isPlayingCustom = false;
  let activeParaIdx = -1;
  let subVideoIdx = 1;

  // Počet videí na odstavec (1-based dle pořadí v názvu souboru _NN.mp4).
  // Díky tomu umíme po posledním videu odstavce čistě skočit zpět na první
  // (loop v rámci odstavce) bez načítání neexistujícího souboru, který by
  // jinak vyvolal error event a viditelný záblesk/pauzu.
  const PART_VIDEO_COUNTS = {
    1: [3, 3, 3, 2, 2, 2, 3, 2, 2, 1, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2],
    2: [3, 2, 3, 2, 1, 1, 2, 3, 2, 2, 2, 2],
    3: [3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2],
  };

  const getParaVideoCount = (part, paraIdx) => {
    let relIdx = parseInt(paraIdx);
    if (part === 2) relIdx -= 15;
    else if (part === 3) relIdx -= 32;
    const arr = PART_VIDEO_COUNTS[part];
    if (arr && relIdx >= 0 && relIdx < arr.length) return arr[relIdx];
    return null; // neznámý počet → fallback na chování řízené error eventem
  };

  const handlePreviewVideoEnded = (videoEl) => {
    if (!isPlayingCustom) return;

    // Specifické pravidlo: 1. díl (activePart === 1), 13. odstavec (activeParaIdx === 13)
    // Přehrávat pouze video 01_14_01 ve smyčce
    if (state.activePart === 1 && parseInt(activeParaIdx) === 13) {
      subVideoIdx = 1;
      loadAndPlayPreview(videoEl, state.activePart, activeParaIdx, subVideoIdx);
      return;
    }

    // V rámci jednoho odstavce drž videa za sebou a po posledním se vrať na
    // první — čistý loop, dokud přepnutí odstavce nespustí nový řetězec.
    const count = getParaVideoCount(state.activePart, activeParaIdx);
    if (count) {
      subVideoIdx = (subVideoIdx % count) + 1; // 1→2→…→count→1
    } else {
      subVideoIdx++; // neznámý počet → loop zajistí error handler
    }
    loadAndPlayPreview(videoEl, state.activePart, activeParaIdx, subVideoIdx);
  };

  const handlePreviewVideoError = (videoEl) => {
    if (!isPlayingCustom) return;
    
    if (subVideoIdx > 1) {
      // Loop back to the first video of this paragraph
      subVideoIdx = 1;
      loadAndPlayPreview(videoEl, state.activePart, activeParaIdx, subVideoIdx);
    } else {
      // It failed even on the first video. Fallback to standby poster.
      isPlayingCustom = false;
      
      const previewPoster = document.getElementById("preview-poster");
      const fullscreenPoster = document.getElementById("fullscreen-poster");
      if (previewPoster) previewPoster.classList.add("active");
      if (fullscreenPoster) fullscreenPoster.classList.add("active");
    
    // Update teaser video
    const teaserVid = document.getElementById("fullscreen-teaser-video");
    if (teaserVid) {
      teaserVid.src = getVideoPath(`video/teaser_${partNum}.mp4`);
      teaserVid.play().catch(e => console.log("Teaser autoplay prevented", e));
    }
    

      // Deactivate any active video element transitions
      if (currentPrevEl) currentPrevEl.classList.remove("active");
      if (nextPrevEl) nextPrevEl.classList.remove("active");
      if (currentFsEl) currentFsEl.classList.remove("active");
      if (nextFsEl) nextFsEl.classList.remove("active");

      if (previewShotId) {
        previewShotId.textContent = "[STANDBY]";
        previewShotId.style.color = "var(--muted)";
      }
      if (fullscreenShotId) {
        fullscreenShotId.textContent = "[STANDBY]";
      }
    }
  };

  const loadAndPlayPreview = (videoEl, part, paraIdx, subIdx) => {
    let relIdx = parseInt(paraIdx);
    if (part === 2) relIdx = relIdx - 15;
    else if (part === 3) relIdx = relIdx - 32;
    
    const paraNum = relIdx + 1; // 1-based paragraph index for filename

    const partStr = String(part).padStart(2, '0');
    const paraStr = String(paraNum).padStart(2, '0');
    const subStr = String(subIdx).padStart(2, '0');
    const src = `video/dil_${part}/${partStr}_${paraStr}_${subStr}.mp4`;
    const shotId = `[${partStr}_${paraStr}_${subStr}]`;
    
    console.log(`Loading custom preview video: ${src}`);
    if (previewShotId) {
      previewShotId.textContent = shotId;
      previewShotId.style.color = "var(--cyan)";
    }
    if (fullscreenShotId) {
      fullscreenShotId.textContent = shotId;
    }

    // Play in preview video
    videoEl.src = getVideoPath(src);
    videoEl.load();
    videoEl.play().catch(e => {
      console.warn(`Failed to play ${src}:`, e.message);
      // Do not trigger handlePreviewVideoError here to prevent double-firing with the error event listener
    });

    // Mirror to fullscreen if overlay is active
    if (state.fullscreenMode) {
      syncFullscreenSource(src);
    }
  };

  const syncFullscreenSource = (src) => {
    nextFsEl.src = getVideoPath(src);
    nextFsEl.load();
    nextFsEl.play()
      .then(() => {
        nextFsEl.classList.add("active");
        if (currentFsEl && currentFsEl !== nextFsEl) {
          currentFsEl.classList.remove("active");
          const oldFs = currentFsEl;
          setTimeout(() => { oldFs.pause(); }, 1200);
        }
        const temp = currentFsEl;
        currentFsEl = nextFsEl;
        nextFsEl = temp;
      })
      .catch(err => {}); // Ignored intentionally to prevent console spam from browser power-saving
  };

  const startParagraphVideoChain = (part, paraIdx) => {
    activeParaIdx = paraIdx;
    subVideoIdx = 1;



    isPlayingCustom = true;

    // Use nextPrevEl to load and transition
    const paraNum = parseInt(paraIdx) + 1;

    const partStr = String(part).padStart(2, '0');
    const paraStr = String(paraNum).padStart(2, '0');
    const src = `video/dil_${part}/${partStr}_${paraStr}_01.mp4`;
    const shotId = `[${partStr}_${paraStr}_01]`;

    if (previewShotId) {
      previewShotId.textContent = shotId;
      previewShotId.style.color = "var(--cyan)";
    }
    if (fullscreenShotId) {
      fullscreenShotId.textContent = shotId;
    }

    nextPrevEl.src = getVideoPath(src);
    nextPrevEl.load();
    nextPrevEl.play()
      .then(() => {
        nextPrevEl.classList.add("active");
        if (currentPrevEl && currentPrevEl !== nextPrevEl) {
          currentPrevEl.classList.remove("active");
          const oldPrev = currentPrevEl;
          setTimeout(() => { oldPrev.pause(); }, 2200);
        }
        // Swap roles
        const tempPrev = currentPrevEl;
        currentPrevEl = nextPrevEl;
        nextPrevEl = tempPrev;
      })
      .catch(e => {
        // Ignore normal abort/play interruptions on src swaps
        console.log("Preview play interrupted (normal transition):", e.message);
      });

    if (state.fullscreenMode) {
      syncFullscreenSource(src);
    }
  };

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
    nextVideoEl.src = getVideoPath(src);
    nextVideoEl.load();
    nextVideoEl.play().catch(e => console.error("BG video play failed:", e));

    if (!isPlayingCustom && state.activePart !== 3) {
      if (previewShotId) {
        previewShotId.textContent = "[BG_ROTATION]";
        previewShotId.style.color = "var(--muted)";
      }
      if (nextPrevEl) {
        nextPrevEl.src = getVideoPath(src);
        nextPrevEl.load();
        nextPrevEl.play().catch(e => console.error("Prev video play failed:", e));
      }
      
      if (nextPrevEl) nextPrevEl.classList.add("active");
      
      const oldPrevEl = currentPrevEl;
      if (oldPrevEl && oldPrevEl !== nextPrevEl) {
        oldPrevEl.classList.remove("active");
        setTimeout(() => {
          if (!isPlayingCustom && oldPrevEl) oldPrevEl.pause();
        }, 2200);
      }
      
      const tempPrev = currentPrevEl;
      currentPrevEl = nextPrevEl;
      nextPrevEl = tempPrev;
    }

    nextVideoEl.classList.add("active");
    
    const oldVideoEl = currentVideoEl;

    if (oldVideoEl !== nextVideoEl) {
      oldVideoEl.classList.remove("active");
      setTimeout(() => {
        oldVideoEl.pause();
      }, 2200); // Wait for the 2.2s CSS opacity transition
    }
    
    // Swap roles
    const temp = currentVideoEl;
    currentVideoEl = nextVideoEl;
    nextVideoEl = temp;
  };


  // --- UI LISTENERS & CONTROL handlers ---
  const setupUIListeners = () => {
    const btnGallery = document.getElementById("btn-nav-gallery");
    if (btnGallery) {
      btnGallery.addEventListener("click", () => {
        const gallery = document.querySelector(".gallery-section");
        if (gallery) gallery.scrollIntoView({ behavior: "smooth" });
      });
    }
    // Play/Pause Click
    if (playBtn) playBtn.addEventListener("click", togglePlay);

    // Seek Click
    if (progressBar) progressBar.addEventListener("click", seek);

    // TRON top-bar transport
    if (barPlay) barPlay.addEventListener("click", togglePlay);
    if (barStop) barStop.addEventListener("click", () => {
      audio.pause();
      try { audio.currentTime = 0; } catch (e) {}
      state.curIdx = -1;
    });
    if (barScrub) barScrub.addEventListener("click", (e) => {
      if (!state.duration) return;
      const r = barScrub.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      audio.currentTime = f * state.duration;
      state.curIdx = -1;
    });

    // Sync Mode Toggle
    if (btnSync) btnSync.addEventListener("click", toggleCalibration);

    // Export Cues
    if (btnExport) btnExport.addEventListener("click", exportCues);

    // Reset Cues
    if (btnReset) btnReset.addEventListener("click", resetCues);

    // Load custom audio
    if (fileAudio) fileAudio.addEventListener("change", loadAudioFile);

    // Part switching tabs
    if (tabPart1) {
      tabPart1.addEventListener("click", () => setPart(1));
    }
    if (tabPart2) {
      tabPart2.addEventListener("click", () => setPart(2));
    }
    if (tabPart3) {
      tabPart3.addEventListener("click", () => setPart(3));
    }

    // Sticky part switcher buttons
    if (btnStickyPart1) {
      btnStickyPart1.addEventListener("click", () => setPart(1, true));
    }
    if (btnStickyPart2) {
      btnStickyPart2.addEventListener("click", () => {
        if (!state.comicMode && !state.decryptedPart2) {
          const panel = document.getElementById("leak-panel-part2");
          if (panel) panel.scrollIntoView({ behavior: "smooth" });
          runDecryptionAnimation(2);
          return;
        }
        setPart(2, true);
      });
    }
    if (btnStickyPart3) {
      btnStickyPart3.addEventListener("click", () => {
        if (!state.comicMode && !state.decryptedPart3) {
          const panel = document.getElementById("leak-panel-part3");
          if (panel) panel.scrollIntoView({ behavior: "smooth" });
          runDecryptionAnimation(3);
          return;
        }
        setPart(3, true);
      });
    }

    // Decryption button for Part 2
    const btnDecryptPart2 = document.getElementById("btn-decrypt-part2");
    if (btnDecryptPart2) {
      btnDecryptPart2.addEventListener("click", () => runDecryptionAnimation(2));
    }

    // Decryption button for Part 3
    const btnDecryptPart3 = document.getElementById("btn-decrypt-part3");
    if (btnDecryptPart3) {
      btnDecryptPart3.addEventListener("click", () => runDecryptionAnimation(3));
    }

    // Custom preview video playback handlers
    if (prevVideo1) {
      prevVideo1.addEventListener("ended", () => handlePreviewVideoEnded(prevVideo1));
      prevVideo1.addEventListener("error", () => handlePreviewVideoError(prevVideo1));
    }
    if (prevVideo2) {
      prevVideo2.addEventListener("ended", () => handlePreviewVideoEnded(prevVideo2));
      prevVideo2.addEventListener("error", () => handlePreviewVideoError(prevVideo2));
    }

    // Fullscreen Overlay Event Listeners
    if (playerVideoPreview) {
      playerVideoPreview.addEventListener("click", openFullscreenOverlay);
    }
    if (fullscreenCloseBtn) {
      fullscreenCloseBtn.addEventListener("click", closeFullscreenOverlay);
    }

    // Mirror ended/error events for fullscreen videos to match preview video sequence loops
    if (fsVideo1) {
      fsVideo1.addEventListener("ended", () => handleFullscreenVideoEnded(fsVideo1));
      fsVideo1.addEventListener("error", () => handleFullscreenVideoError(fsVideo1));
    }
    if (fsVideo2) {
      fsVideo2.addEventListener("ended", () => handleFullscreenVideoEnded(fsVideo2));
      fsVideo2.addEventListener("error", () => handleFullscreenVideoError(fsVideo2));
    }

    // Setup visual gallery filter buttons
    const filterBtns = document.querySelectorAll(".gallery-filter-btn");
    const galleryCards = document.querySelectorAll(".gallery-card");

    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // Toggle active class on buttons
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter;
        galleryCards.forEach(card => {
          if (filter === "all" || card.dataset.part === filter) {
            card.classList.remove("hidden");
          } else {
            card.classList.add("hidden");
          }
        });
      });
    });

    // Clicking gallery cards opens the image in fullscreen overlay
    galleryCards.forEach(card => {
      card.addEventListener("click", () => {
        const src = card.dataset.src;
        const label = card.querySelector(".gallery-card-label").textContent;
        const shotId = card.querySelector(".gallery-card-id").textContent;

        openFullscreenImage(src, label, shotId);
      });
    });
  };

  const openFullscreenImage = (imgSrc, label, shotId) => {
    state.fullscreenMode = true;
    if (fullscreenOverlay) {
      fullscreenOverlay.classList.add("active");
    }

    const fullscreenPoster = document.getElementById("fullscreen-poster");
    const fullscreenPosterImg = document.getElementById("fullscreen-poster-img");
    const fullscreenPosterTitle = document.getElementById("fullscreen-poster-title");

    if (fullscreenPoster) fullscreenPoster.classList.add("active");
    
    // Update teaser video
    const teaserVid = document.getElementById("fullscreen-teaser-video");
    if (teaserVid) {
      teaserVid.src = getVideoPath(`video/teaser_${partNum}.mp4`);
      teaserVid.play().catch(e => console.log("Teaser autoplay prevented", e));
    }
    
    if (fullscreenPosterImg) fullscreenPosterImg.src = imgSrc;
    if (fullscreenPosterTitle) fullscreenPosterTitle.textContent = label;

    if (fullscreenSubtitles) {
      fullscreenSubtitles.textContent = label;
    }
    if (fullscreenShotId) {
      fullscreenShotId.textContent = shotId;
    }

    // Deactivate active videos in overlay
    if (fsVideo1) fsVideo1.classList.remove("active");
    if (fsVideo2) fsVideo2.classList.remove("active");
  };

  const openFullscreenOverlay = () => {
    state.fullscreenMode = true;
    if (fullscreenOverlay) {
      fullscreenOverlay.classList.add("active");
    }
    
    // Sync current sentence + word highlighting immediately
    updateCinemaSubtitle(state.curIdx, state.calibMode ? state.currentTime : Math.max(0, state.currentTime - 0.4));

    // Sync source from active preview element
    const activeSrc = currentPrevEl.src;
    const activeShot = previewShotId ? previewShotId.textContent : "[STANDBY]";
    if (fullscreenShotId) {
      fullscreenShotId.textContent = activeShot;
    }
    
    if (activeSrc) {
      syncFullscreenSource(activeSrc);
    }
  };

  const closeFullscreenOverlay = () => {
    state.fullscreenMode = false;
    if (fullscreenOverlay) {
      fullscreenOverlay.classList.remove("active");
    }
    // Pause both fullscreen videos to save resources
    if (fsVideo1) fsVideo1.pause();
    if (fsVideo2) fsVideo2.pause();

    // Revert the mode selector button back to last active non-movie mode
    const btnModeText = document.getElementById("btn-mode-text");
    const btnModeComic = document.getElementById("btn-mode-comic");
    const btnModeMovie = document.getElementById("btn-mode-movie");
    
    btnModeMovie?.classList.remove("active");
    if (state.comicMode) {
      btnModeComic?.classList.add("active");
    } else {
      btnModeText?.classList.add("active");
    }
  };

  const handleFullscreenVideoEnded = (videoEl) => {
    if (!isPlayingCustom) return;
    
    // Looping rules matching preview video logic
    if (state.activePart === 1 && parseInt(activeParaIdx) === 13) {
      // Loop the same video 01_14_01
      subVideoIdx = 1;
      loadAndPlayFullscreenMirror(videoEl, state.activePart, activeParaIdx, subVideoIdx);
      return;
    }

    // The preview video ended handler increments subVideoIdx and triggers loadAndPlayPreview.
    // The loadAndPlayPreview will call syncFullscreenSource(src) which already switches currentFsEl.
    // However, if the user interacts with the fullscreen overlay, we let the preview video guide the chain
    // or mirror it here. To be safe, we just let the preview video control the increment and we mirror.
    // If the fullscreen video ends independently, we check if it is out of sync.
  };

  const handleFullscreenVideoError = (videoEl) => {
    // If fullscreen video fails, fallback to current background source
    videoEl.src = getVideoPath(currentVideoEl.src);
    videoEl.load();
    videoEl.play().catch(() => {});
  };

  const loadAndPlayFullscreenMirror = (videoEl, part, paraIdx, subIdx) => {
    const paraNum = parseInt(paraIdx) + 1;

    const partStr = String(part).padStart(2, '0');
    const paraStr = String(paraNum).padStart(2, '0');
    const subStr = String(subIdx).padStart(2, '0');
    const src = `video/dil_${part}/${partStr}_${paraStr}_${subStr}.mp4`;
    
    videoEl.src = getVideoPath(src);
    videoEl.load();
    videoEl.play().catch(() => {});
  };

  const runDecryptionAnimation = (targetPart = 2) => {
    const btn = document.getElementById(`btn-decrypt-part${targetPart}`);
    const progressEl = document.getElementById(`decrypt-progress-part${targetPart}`);
    const statusEl = document.getElementById(`leak-status-part${targetPart}`);
    
    if (btn) btn.disabled = true;
    if (btn) btn.textContent = "DEKRYPTUJI...";
    if (statusEl) {
      statusEl.textContent = "DEKRYPTUJI...";
      statusEl.style.color = "var(--amber)";
      statusEl.style.borderColor = "var(--amber)";
      statusEl.style.background = "rgba(255, 181, 46, 0.1)";
    }
    
    let pct = 0;
    const interval = setInterval(() => {
      pct += 5;
      if (progressEl) progressEl.textContent = `${pct}%`;
      
      if (pct >= 100) {
        clearInterval(interval);
        
        // Persist decryption state
        if (targetPart === 2) {
          state.decryptedPart2 = true;
          localStorage.setItem("decrypted_part2", "true");
        } else if (targetPart === 3) {
          state.decryptedPart3 = true;
          localStorage.setItem("decrypted_part3", "true");
        }
        
        setPart(targetPart, targetPart === 2); // Swap to targetPart and play (for part 2)
      }
    }, 80);
  };

  const togglePlay = () => {
    if (!audio) return;
    if (audio.paused) {
      const savedTime = audio.currentTime;
      playerStatus.textContent = "NAČÍTÁM…";
      playerStatus.style.color = "var(--muted)";
      
      if (savedTime === 0) {
        audio.load();
      }
      
      const playWithDelay = () => {
        if (savedTime > 0) {
          audio.currentTime = savedTime;
        }
        audio.play()
          .then(() => {
            updateStatus();
          })
          .catch(e => {
            console.error("Audio playback error:", e);
            updateStatus();
          });
      };

      if (audio.readyState >= 2) {
        playWithDelay();
      } else {
        audio.addEventListener("canplay", function onCanPlay() {
          audio.removeEventListener("canplay", onCanPlay);
          playWithDelay();
        });
      }
    } else {
      audio.pause();
    }
  };

  const seek = (e) => {
    if (!audio || !state.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * state.duration;
    // Force preview video to restart on seek
    state.curIdx = -1;
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
      localStorage.setItem(`ruda_cues_v3_part${state.activePart}`, JSON.stringify(cues));
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
      a.download = `ruda_cues_part${state.activePart}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }

    setHint("Časování bylo staženo a uloženo do schránky.");
  };

  const resetCues = () => {
    const defaultCues = state.activePart === 1 ? PART1_CUES : (state.activePart === 2 ? PART2_CUES : PART3_CUES);
    cues = [...defaultCues];
    try {
      localStorage.setItem(`ruda_cues_v3_part${state.activePart}`, JSON.stringify(cues));
    } catch (e) {}
    
    state.curIdx = -1;
    highlightParagraph(-1);
    updateKaraokeDisplay("", "PŘIPRAVENO", "");
    
    setHint("Časování bylo resetováno na výchozí přesné hodnoty.");
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
