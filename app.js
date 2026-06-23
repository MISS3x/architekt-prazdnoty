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
    decryptedPart2: true, // UX jako reference: díly se přepínají okamžitě, bez dekrypční brány
    decryptedPart3: true,
    fullscreenMode: false,
    comicMode: false,
    audioMode: false,
    restoring: false
  };

  const saveState = () => {
    if (state.restoring) return;
    try {
      localStorage.setItem("ap_active_part", state.activePart);
      localStorage.setItem("ap_current_time", state.currentTime);
      let mode = "text";
      if (state.comicMode) mode = "comic";
      else if (state.audioMode) mode = "audio";
      else if (state.fullscreenMode) mode = "movie";
      localStorage.setItem("ap_active_mode", mode);
    } catch (e) {
      console.warn("Could not save state to localStorage:", e);
    }
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
  let activeWordEl = null;     // aktuálně čtené slovo (text režim) — pro centrování po řádcích
  let lastUserScrollTime = 0;
  let lastSavedTime = 0;
  let pendingPlayHandler = null;
  const COUNTDOWN_SECONDS = 7; // static-poster countdown before comic/film starts
  let countdownTimer = null;
  const POSTERS = { 1: "avatar/ruda/ruda.png", 2: "avatar/mia/mia.png", 3: "avatar/krtek/krtek.png" };
  const POSTER_HERO_DATA = {
    1: { rom: "DÍL I", title: "ARCHITEKT<br><span class=\"ch-title-em\">PRÁZDNOTY</span>", meta: "Čte: Ruda Müller · New Berlin · MMXXVI" },
    2: { rom: "DÍL II", title: "VČELÍ MOR<br><span class=\"ch-title-em\">A NEURO-NEKRÓZA</span>", meta: "Čte: Mia Müllerová · New Berlin · MMXXVI" },
    3: { rom: "DÍL III", title: "MATEŘÍ<br><span class=\"ch-title-em\">KAŠIČKA 2.0</span>", meta: "Čte: Krtek · Hory Starého Světa · MMXXVI" },
  };

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
  const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
  const PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>';
  const setBarPlayIcon = (playing) => { if (barPlay) barPlay.innerHTML = playing ? PAUSE_SVG : PLAY_SVG; };
  // Dynamicky měř výšku dvouřadé lišty → --ap-barH / --barH (offset obsahu)
  const measureBarHeight = () => {
    const bar = document.getElementById("top-nav");
    if (!bar) return;
    const h = bar.offsetHeight;
    if (h > 0) {
      document.documentElement.style.setProperty("--ap-barH", h + "px");
      document.documentElement.style.setProperty("--barH", h + "px");
    }
  };
  const barEpTitle = document.getElementById("bar-eptitle");
  const EP_TITLES = { 1: { rom: "I", t: "ARCHITEKT PRÁZDNOTY" }, 2: { rom: "II", t: "VČELÍ MOR A NEURO-NEKRÓZA" }, 3: { rom: "III", t: "MATEŘÍ KAŠIČKA 2.0" } };
  const updateBarEpTitle = (partNum) => {
    const e = EP_TITLES[partNum]; if (barEpTitle && e) barEpTitle.innerHTML = `<b>DÍL ${e.rom}</b> · ${e.t}`;
  };
  // Film HUD: // NÁZEV  +  SCÉNA x / N  (scéna = aktivní odstavec z N)
  const updateFilmHud = (idx) => {
    const sc = document.getElementById("film-hud-scene");
    const ti = document.getElementById("film-hud-title");
    if (sc) sc.textContent = `SCÉNA ${Math.max(1, (parseInt(idx) || 0) + 1)} / ${N || 1}`;
    if (ti) { const e = EP_TITLES[state.activePart]; if (e) ti.textContent = `// ${e.t}`; }
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
  const audioFx = { analyser: null, data: null, ctx: null, stream: null };
  const mediaFx = { analyser: null, data: null, source: null };
  let audioMicOn = false;
  let audioMatrixStop = null;

  // Předpočítané spektrum MP3 (audio/dil_N.spectrum.json) — pohon equalizeru
  // bez mikrofonu a bez živého Web Audio na <audio> (zvuk tak nikdy neztichne).
  const spectrum = { fps: 20, bands: 32, frames: 0, data: null };
  let spectrumPart = 0;
  const loadSpectrum = (partNum) => {
    if (spectrumPart === partNum && spectrum.data) return;
    spectrumPart = partNum;
    spectrum.data = null;
    fetch(`audio/dil_${partNum}.spectrum.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j || spectrumPart !== partNum) return;
        spectrum.fps = j.fps; spectrum.bands = j.bands; spectrum.frames = j.frames;
        const bin = atob(j.data);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        spectrum.data = u;
      })
      .catch(() => {});
  };

  // Analyzér nad PŘEHRÁVANÝM <audio> (MP3) — plástev reaguje na reálné audio bez mikrofonu.
  // createMediaElementSource lze volat jen jednou; audio pak teče přes analyser → destination.
  const ensureMediaAnalyser = () => {
    if (mediaFx.analyser || !audio) return;
    try {
      if (!audioFx.ctx) audioFx.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioFx.ctx;
      const src = ctx.createMediaElementSource(audio);
      const an = ctx.createAnalyser();
      an.fftSize = 128; an.smoothingTimeConstant = 0.8;
      src.connect(an); an.connect(ctx.destination); // jinak by audio ztichlo
      mediaFx.analyser = an; mediaFx.data = new Uint8Array(an.frequencyBinCount); mediaFx.source = src;
    } catch (e) { console.warn("Media-element analyser nelze vytvořit:", e); }
  };
  const resumeAudioCtx = () => {
    if (audioFx.ctx && audioFx.ctx.state === "suspended") audioFx.ctx.resume().catch(() => {});
  };

  const buildAudioStage = () => {
    if (audioStageEl) return audioStageEl;
    const el = document.createElement("div");
    el.id = "audio-stage";
    el.className = "ap-audio2 paused";
    el.style.display = "none";
    el.innerHTML =
      '<div class="ap-audioinfo"><span class="ap-akick" id="audio-kick"></span>' +
      '<h2 class="ap-atitle" id="audio-title"></h2><span class="ap-anarr" id="audio-narr"></span></div>' +
      '<div class="ap-matrixwrap"><canvas class="ap-matrix"></canvas>' +
      '<span class="ap-draghint">⟲ táhni — vodorovně otáčí, svisle naklání</span></div>' +
      '<div class="ap-words" id="audio-words"></div>' +
      '<div class="ap-actrls">' +
      '<div class="ap-astatus"><span class="ap-aled" id="audio-led"></span>' +
      '<span id="audio-status">Připraveno k přehrání</span></div></div>';
    document.body.appendChild(el);
    audioStageEl = el;
    return el;
  };

  // Globální velké play/pauza tlačítko přes hlavní content (audio/film/komiks/text).
  // Auto-hide jako u video přehrávače: při přehrávání skryté, objeví se na pohyb/dotyk
  // (a ukáže pauzu); při pauze (i úvod) je trvale vidět play. Klik na konci = znovu.
  let gppUiTimer = null;
  const setupGlobalPlayButton = () => {
    if (document.getElementById("gpp")) return;
    const gpp = document.createElement("button");
    gpp.id = "gpp"; gpp.className = "gpp"; gpp.title = "Přehrát / Pauza / Znovu";
    gpp.innerHTML =
      '<svg class="ic-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
      '<svg class="ic-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>' +
      '<span class="gpp-text">PŘEHRÁT / CLICK TO PLAY</span>';
    document.body.appendChild(gpp);
    gpp.addEventListener("click", () => {
      if (audio && state.duration && audio.currentTime >= state.duration - 0.3) {
        try { audio.currentTime = 0; } catch (e) {}
      }
      togglePlay();
    });
    const ping = () => {
      document.body.classList.add("ui-active");
      if (gppUiTimer) clearTimeout(gppUiTimer);
      gppUiTimer = setTimeout(() => document.body.classList.remove("ui-active"), 2200);
    };
    ["mousemove", "touchstart", "pointerdown", "wheel", "keydown"].forEach(ev =>
      window.addEventListener(ev, ping, { passive: true }));

    // Click/touch screen to play/pause in comic & film modes
    const handleScreenTapToggle = (e) => {
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest("input") || 
          e.target.closest(".speech-bubble") || e.target.closest(".player-wrapper") || 
          e.target.closest(".sticky-mode-switcher") || e.target.closest(".drag-grip") ||
          e.target.closest(".ap-actrls") || e.target.closest(".ap-words")) {
        return;
      }
      togglePlay();
    };

    const fsOverlay = document.getElementById("fullscreen-overlay");
    if (fsOverlay) fsOverlay.addEventListener("click", handleScreenTapToggle);

    [1, 2, 3].forEach(p => {
      const grid = document.querySelector(`#comic-content-part${p} .comic-grid`);
      if (grid) grid.addEventListener("click", handleScreenTapToggle);
    });
  };

  const updateAudioStage = (partNum) => {
    if (!audioStageEl) return;
    loadSpectrum(partNum);
    const m = AUDIO_META[partNum] || AUDIO_META[1];
    const kick = document.getElementById("audio-kick");
    const title = document.getElementById("audio-title");
    const narr = document.getElementById("audio-narr");
    if (kick) kick.textContent = "// Audiokniha · Díl " + m.rom;
    if (title) title.innerHTML = `${m.title} <span class="am">${m.am}</span>`;
    if (narr) narr.textContent = "Čte " + m.who;
  };
  const updateAudioMicUI = () => {
    const btn = document.getElementById("audio-mic");
    const lab = document.getElementById("audio-mic-label");
    if (btn) btn.classList.toggle("on", audioMicOn);
    if (lab) lab.textContent = audioMicOn ? "Reaguje na zvuk z mikrofonu" : "Reagovat na živý zvuk (mikrofon)";
    setAudioPlaying(state.playing);
  };
  const startAudioMic = async () => {
    const fx = audioFx;
    try {
      if (!fx.ctx) fx.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (fx.ctx.state === "suspended") await fx.ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fx.stream = stream;
      const src = fx.ctx.createMediaStreamSource(stream);
      const an = fx.ctx.createAnalyser();
      an.fftSize = 128; an.smoothingTimeConstant = 0.78;
      src.connect(an);
      fx.analyser = an; fx.data = new Uint8Array(an.frequencyBinCount);
      audioMicOn = true; updateAudioMicUI();
    } catch (e) { alert("Mikrofon se nepodařilo spustit: " + e.message); }
  };
  const stopAudioMic = () => {
    const fx = audioFx;
    if (fx.stream) { fx.stream.getTracks().forEach((tr) => tr.stop()); fx.stream = null; }
    fx.analyser = null; fx.data = null;
    audioMicOn = false; updateAudioMicUI();
  };
  const toggleAudioMic = () => { audioMicOn ? stopAudioMic() : startAudioMic(); };

  const setAudioPlaying = (playing) => {
    if (!audioStageEl) return;
    audioStageEl.classList.toggle("paused", !playing);
    const led = document.getElementById("audio-led");
    const st = document.getElementById("audio-status");
    if (led) led.classList.toggle("on", playing || audioMicOn);
    if (st) st.textContent = audioMicOn ? "Živá spektrální analýza"
      : (playing ? "Přehrávám · simulace spektra" : (state.currentTime > 0 ? "Pozastaveno" : "Připraveno k přehrání"));
  };

  // AUDIO — 3D prostorová pixelová plástev (canvas). Port z design projektu;
  // řízeno state.playing (simulace) nebo živým mikrofonem (audioMicOn).
  const startAudioMatrix = () => {
    if (audioMatrixStop || !audioStageEl) return;
    const cv = audioStageEl.querySelector(".ap-matrix");
    const wrap = audioStageEl.querySelector(".ap-matrixwrap");
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches;

    const CORE = mobile ? 6 : 8, FADE_RINGS = mobile ? 2 : 3, RINGS = CORE + FADE_RINGS;
    const S = 0.62, HEXR = S * 0.88, MAXH = 6.2, CAM = 30;
    let tilt = 1.02, dpr = 1, raf, t = 0, angle = 0, focal = 1, cx = 0, cy = 0, curOp = 1;

    const hexes = [];
    let maxRad = 0.0001;
    for (let q = -RINGS; q <= RINGS; q++) {
      const rr1 = Math.max(-RINGS, -q - RINGS), rr2 = Math.min(RINGS, -q + RINGS);
      for (let r = rr1; r <= rr2; r++) {
        const x = 1.5 * S * q;
        const z = Math.sqrt(3) * S * (r + q / 2);
        const rad = Math.sqrt(x * x + z * z);
        const ring = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
        const over = Math.max(0, ring - CORE);
        const scale = Math.pow(0.8, over);
        const fade = over === 0 ? 1 : Math.pow(0.74, over);
        if (ring <= CORE && rad > maxRad) maxRad = rad;
        hexes.push({ x, z, rad, ang: Math.atan2(z, x), scale, fade });
      }
    }
    const HN = hexes.length;
    const field = new Float32Array(HN), tgt = new Float32Array(HN);
    const order = new Array(HN);
    for (let k = 0; k < HN; k++) order[k] = k;
    const CORN = [];
    for (let c = 0; c < 6; c++) { const a = (Math.PI / 3) * c; CORN.push([Math.cos(a) * HEXR, Math.sin(a) * HEXR]); }

    const fit = () => {
      const W = Math.max(120, wrap.clientWidth), H = Math.max(120, wrap.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      focal = cv.height * 0.62; cx = cv.width / 2; cy = cv.height * 0.54;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrap);

    let dragging = false, lastX = 0, lastY = 0, vel = 0, moved = 0;
    const onDown = (e) => { dragging = true; const p = e.touches ? e.touches[0] : e; lastX = p.clientX; lastY = p.clientY; moved = 0; vel = 0; cv.style.cursor = "grabbing"; };
    const onMove = (e) => { if (!dragging) return; const p = e.touches ? e.touches[0] : e; const dx = p.clientX - lastX, dy = p.clientY - lastY; lastX = p.clientX; lastY = p.clientY; moved += Math.abs(dx) + Math.abs(dy); angle += dx * 0.01; vel = dx * 0.01; tilt = Math.max(0.18, Math.min(1.48, tilt + dy * 0.006)); if (e.cancelable) e.preventDefault(); };
    // tap (bez tažení) = play/pauza celého audia; tažení = otáčení equalizeru
    const onUp = () => { if (dragging && moved < 6) { vel = 0; togglePlay(); } dragging = false; cv.style.cursor = "grab"; };
    cv.style.cursor = "grab";
    cv.addEventListener("mousedown", onDown); cv.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mousemove", onMove); window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp); window.addEventListener("touchend", onUp);

    const draw = () => {
      const play = state.playing && !reduce;
      // Stopnuté/pozastavené audio → equalizer ještě víc ztlumený (plynule, deterministicky dle state.playing).
      curOp += ((state.playing ? 1 : 0.32) - curOp) * 0.10;
      cv.style.opacity = curOp.toFixed(3);
      if (dragging) { /* angle řízen myší */ }
      else { angle += vel + (play ? 0.0042 : 0.0011); vel *= 0.92; }
      t += play ? 0.03 : 0.014;

      // Zdroj pásem (0..255): mikrofon (přednost) → jinak PŘEDPOČÍTANÉ spektrum MP3
      // při přehrávání → jinak null (simulace). Žádný živý Web Audio na <audio>.
      let bandsArr = null, nb = 0, peak = 0;
      if (audioMicOn && audioFx.analyser) {
        audioFx.analyser.getByteFrequencyData(audioFx.data);
        bandsArr = audioFx.data; nb = bandsArr.length;
      } else if (state.playing && spectrum.data && spectrum.frames > 0) {
        const fr = Math.min(spectrum.frames - 1, Math.max(0, Math.floor(audio.currentTime * spectrum.fps)));
        bandsArr = spectrum.data.subarray(fr * spectrum.bands, fr * spectrum.bands + spectrum.bands);
        nb = spectrum.bands;
      }
      if (bandsArr) { for (let i = 0; i < nb; i++) if (bandsArr[i] > peak) peak = bandsArr[i]; peak /= 255; }
      const real = !!bandsArr;
      const maxR = maxRad;
      for (let k = 0; k < HN; k++) {
        const hx = hexes[k], rad = hx.rad;
        let v;
        if (real) {
          // STŘED = celková hlasitost (peak) → maxima a červená uprostřed; k okraji útlum.
          const norm = Math.min(1, rad / maxR);             // 0 = střed, 1 = okraj
          const bi = Math.max(0, Math.min(nb - 1, Math.floor(norm * norm * nb)));
          const band = bandsArr[bi] / 255;
          v = (0.7 * peak + 0.3 * band) * 2.1 * (1 - 0.6 * norm); // gain → maxima dosáhnou červené
          v = Math.pow(v, 0.9) * 1.3;
          v *= 0.8 + 0.2 * Math.sin(hx.ang * 3 + t * 4);
          const edgeFloor = 0.04 + 0.05 * (1 - norm);       // floor o něco vyšší ve středu
          v = Math.max(edgeFloor, Math.min(1, v));
        } else if (play) {
          // Simulation: waves radiate outward from center, edges stay alive
          v = 0.55 + 0.45 * Math.sin(t * 2.2 - rad * 0.85)
            + 0.38 * Math.sin(t * 1.3 + hx.x * 0.45)
            + 0.38 * Math.sin(t * 1.7 + hx.z * 0.45);
          v = v / 1.75;
          // Gentler fade at edges so they stay visible
          v *= 1 - (rad / (maxR * 1.6)) * 0.65;
          v *= 0.6 + 0.4 * Math.abs(Math.sin(t * 0.55));
          // Edge floor — always show something
          const edgeFloor = 0.06 + 0.12 * (rad / maxR);
          v = Math.max(edgeFloor, Math.min(1, v));
        } else {
          // Idle ripple — full grid stays visible, edges at ~30% height
          const ripple = Math.sin(rad * 1.0 - t * 1.5);
          const cross = Math.sin(hx.x * 0.42 + t * 0.9) * Math.sin(hx.z * 0.42 - t * 0.7);
          const swirl = Math.sin(hx.ang * 2 + rad * 0.4 - t * 1.0);
          let w = 0.38 + 0.28 * ripple + 0.20 * cross + 0.14 * swirl;
          // Edges get ~30% of center height, not near-zero
          w = w * (0.35 + 0.65 * (1 - rad / (maxR * 1.4)));
          w *= 0.72 + 0.28 * Math.sin(t * 0.35);
          const edgeFloor = 0.06 + 0.10 * (rad / maxR);
          v = Math.max(edgeFloor, Math.min(0.75, w));
        }
        tgt[k] = Number.isFinite(v) ? v : 0; // pojistka: nikdy NaN do rendereru
      }
      for (let k = 0; k < HN; k++) {
        const up = tgt[k] > field[k];
        field[k] += (tgt[k] - field[k]) * (up ? 0.45 : 0.12);
      }

      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(tilt), st = Math.sin(tilt);
      const proj = (x, y, z) => {
        const X = x * ca - z * sa, Z = x * sa + z * ca;
        const Yy = y * ct + Z * st, Zz = Z * ct - y * st;
        const f = focal / (CAM + Zz);
        return [cx + X * f, cy - Yy * f, Zz];
      };

      order.sort((a, b) => {
        const ha = hexes[a], hb = hexes[b];
        return (hb.x * sa + hb.z * ca) - (ha.x * sa + ha.z * ca);
      });

      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "lighter";

      for (let oi = 0; oi < order.length; oi++) {
        const k = order[oi];
        const hx = hexes[k];
        const cxw = hx.x, czw = hx.z;
        const hr = field[k], h = hr * MAXH;
        // Full sweep: cyan(190) → amber(40) → red(0) as hr goes 0→1
        const hue = hr < 0.75 ? 190 - 200 * hr : Math.max(0, 40 - 160 * (hr - 0.75));
        const sc = hx.scale, fd = hx.fade;
        const cn = hx.cn || (hx.cn = [[CORN[0][0]*sc,CORN[0][1]*sc],[CORN[1][0]*sc,CORN[1][1]*sc],[CORN[2][0]*sc,CORN[2][1]*sc],[CORN[3][0]*sc,CORN[3][1]*sc],[CORN[4][0]*sc,CORN[4][1]*sc],[CORN[5][0]*sc,CORN[5][1]*sc]]);

        if (h < 0.16) {
          ctx.strokeStyle = "rgba(45,226,255," + (0.07 * fd).toFixed(3) + ")";
          ctx.lineWidth = Math.max(0.6, dpr * 0.6);
          ctx.beginPath();
          for (let c = 0; c < 6; c++) { const p = proj(cxw + cn[c][0], 0, czw + cn[c][1]); c ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
          ctx.closePath(); ctx.stroke();
          continue;
        }

        const aWall = (0.10 + 0.26 * hr) * fd;
        for (let c = 0; c < 6; c++) {
          const c2 = (c + 1) % 6;
          const b0 = proj(cxw + cn[c][0], 0, czw + cn[c][1]);
          const b1 = proj(cxw + cn[c2][0], 0, czw + cn[c2][1]);
          const t1 = proj(cxw + cn[c2][0], h, czw + cn[c2][1]);
          const t0 = proj(cxw + cn[c][0], h, czw + cn[c][1]);
          const shade = 0.55 + 0.45 * Math.abs(Math.cos((Math.PI / 3) * c + angle));
          ctx.fillStyle = "hsla(" + hue + " 95% 56% / " + (aWall * shade).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]);
          ctx.lineTo(t1[0], t1[1]); ctx.lineTo(t0[0], t0[1]); ctx.closePath();
          ctx.fill();
        }

        // shadowBlur odstranen (drahe) — zari dela lighter kompozice + jasna barva
        ctx.fillStyle = "hsla(" + hue + " 100% " + (58 + 14 * hr) + "% / " + ((0.22 + 0.42 * hr) * fd).toFixed(3) + ")";
        ctx.beginPath();
        for (let c = 0; c < 6; c++) { const p = proj(cxw + cn[c][0], h, czw + cn[c][1]); c ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "hsla(" + hue + " 100% 82% / " + ((0.5 + 0.4 * hr) * fd).toFixed(3) + ")";
        ctx.lineWidth = Math.max(1, dpr * 0.9);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      const scan = 3 * dpr;
      ctx.fillStyle = "rgba(2,8,14,0.16)";
      for (let y = (t * 22 * dpr) % (scan * 2); y < cv.height; y += scan * 2) {
        ctx.fillRect(0, y, cv.width, scan);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    audioMatrixStop = () => {
      cancelAnimationFrame(raf); ro.disconnect();
      cv.removeEventListener("mousedown", onDown); cv.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove); window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp); window.removeEventListener("touchend", onUp);
    };
  };
  const stopAudioMatrix = () => { if (audioMatrixStop) { audioMatrixStop(); audioMatrixStop = null; } };

  const showAudioStage = (show) => {
    const el = buildAudioStage();
    el.style.display = show ? "block" : "none";
    if (show) {
      resumeAudioCtx();
      updateAudioStage(state.activePart);
      setAudioPlaying(state.playing);
      requestAnimationFrame(startAudioMatrix);
    } else {
      stopAudioMatrix();
      stopAudioMic();
    }
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

  // 3D karusel slov v audio rezimu: kazde nove slovo prileti zepredu a odpluje dozadu.
  let lastAudioWord = "";
  const AUDIO_STOPWORDS = new Set(["a","i","k","o","s","u","v","z","do","ke","ku","na","po","se","ze","za","ve","od","ob","při","pro","bez","nad","pod","před","mezi","přes","skrz","ale","že","či","nebo"]);
  const pushAudioWord = (w) => {
    const cont = audioStageEl && audioStageEl.querySelector(".ap-words");
    if (!cont) return;
    const el = document.createElement("span");
    el.className = "ap-word";
    el.textContent = w;
    el.style.left = (28 + Math.random() * 44) + "%";
    el.style.top = (34 + Math.random() * 30) + "%";
    cont.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
    while (cont.children.length > 16) cont.removeChild(cont.firstChild);
  };
  const updateKaraokeDisplay = (prev, current, next) => {
    if (state.audioMode && current && current !== lastAudioWord && current !== "PŘIPRAVENO") {
      lastAudioWord = current;
      const nw = current.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž]/g, "");
      if (nw.length > 1 && !AUDIO_STOPWORDS.has(nw)) pushAudioWord(current);
    }
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
      teaserVid.play().catch(e => {
        if (e.name !== "AbortError" && e.name !== "NotAllowedError") {
          console.log("Teaser autoplay prevented", e);
        }
      });
    }

    // Update poster hero content
    const phd = POSTER_HERO_DATA[partNum] || POSTER_HERO_DATA[1];
    ['poster-ch-rom', 'poster-ch-title', 'poster-ch-meta'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = [phd.rom, phd.title, phd.meta][i];
    });
    

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
    updateFilmHud(-1);
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

      // UX jako reference: žádný countdown — komiks/film/text startují okamžitě.
      if (state.comicMode) scrollComicToStart(partNum);
      beginPlayback();
    }
    saveState();
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

    // Klasifikuj bubliny podle délky textu → na mobilu menší font + vyšší obrázek,
    // aby se dlouhý text vešel a nepřetékal panel.
    document.querySelectorAll(".comic-panel").forEach(panel => {
      const st = panel.querySelector(".speech-text");
      const len = st ? (st.textContent || "").trim().length : 0;
      panel.classList.remove("short-bubble", "long-bubble", "xlong-bubble");
      if (len > 150) panel.classList.add("xlong-bubble");
      else if (len > 95) panel.classList.add("long-bubble");
      else if (len < 45) panel.classList.add("short-bubble"); // krátký text → větší font
    });

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
        const phd = POSTER_HERO_DATA[p];
        const card = document.createElement("div");
        card.className = "comic-title-card";
        card.innerHTML =
          `<img class="ctc-img" src="${t.img}" alt="">` +
          `<div class="ctc-overlay"></div>` +
          `<div class="preview-poster-content ch-poster-hero" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 3; text-align: center; background: none !important;">` +
            `<div class="ch-eyebrow">// AUDIOKNIHA &middot; RUDA-50</div>` +
            `<div class="ch-rom">${phd.rom}</div>` +
            `<div class="ch-title poster-ch-title">${phd.title}</div>` +
            `<div class="ch-meta">${phd.meta}</div>` +
            `<div class="ch-line"></div>` +
          `</div>`;
        grid.insertBefore(card, grid.firstChild);
      }

      // Pozn.: kolečko myši v komiksu řeší globální wheel handler (scrub po větách),
      // strip se pak dorovná na aktivní panel (centerActiveContent).
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

    // Restore or Initialize state
    const savedPart = localStorage.getItem("ap_active_part");
    const savedTime = localStorage.getItem("ap_current_time");
    const savedMode = localStorage.getItem("ap_active_mode");

    state.restoring = true;

    const partToLoad = savedPart ? parseInt(savedPart) : 1;
    setPart(partToLoad, false);

    if (savedTime && audio) {
      const timeVal = parseFloat(savedTime);
      state.currentTime = timeVal;
      const displayTime = state.calibMode ? state.currentTime : Math.max(0, state.currentTime - (state.comicMode ? 0.05 : 0.4));
      state.curIdx = getActiveIndex(displayTime);
      
      // Perform initial highlighting
      onTimeUpdate();
    }

    // setActiveModeUI je const definovaný níž → odlož aplikaci režimu za konec
    // synchronního initu (jinak TDZ ReferenceError → pád celého initu).
    queueMicrotask(() => { setActiveModeUI(savedMode || "movie"); });

    if (savedTime && audio) {
      const timeVal = parseFloat(savedTime);
      
      // Schedule instant snap as soon as DOM layout settles
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          snapViewToCurrentTime();
          state.restoring = false;
          lastUserScrollTime = 0;
        });
      });

      // When audio is actually ready, restore the playback time
      const onMetadataRestore = () => {
        audio.removeEventListener("loadedmetadata", onMetadataRestore);
        try {
          audio.currentTime = timeVal;
        } catch (e) {
          console.warn("Failed to set audio.currentTime during restore:", e);
        }
      };

      if (audio.readyState >= 1) {
        onMetadataRestore();
      } else {
        audio.addEventListener("loadedmetadata", onMetadataRestore);
      }
    } else {
      state.restoring = false;
    }

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
    setupGlobalPlayButton(); // globální velké play/pauza tlačítko (audio/film/komiks/text)

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
    // Tažení scrollbaru (držené tlačítko) je také user-intent → udrží seek živý.
    window.addEventListener("mousemove", (e) => { if (e.buttons) registerUserInteraction(); }, { passive: true });
    window.addEventListener("keydown", (e) => {
      const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", "Home", "End"];
      if (scrollKeys.includes(e.key)) {
        registerUserInteraction();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        registerUserInteraction();
        scrubByCue(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        registerUserInteraction();
        scrubByCue(-1);
      }
    });

    // Pozn.: scroll→seek (handleUserScrollSeek) je vypnuté — kolidovalo s
    // posunem po větách kolečkem. Obsah teď sleduje audio JEN jednosměrně
    // (čas → pozice): auto-follow při hře + centerActiveContent po seeku/scrubu.

    // Kolečko myši = posun audio stopy po VĚTÁCH ve VŠECH režimech
    // (text/komiks/film/audio). Po skoku se příslušný obsah dorovná na aktuální čas.
    let lastCueScrub = 0;
    window.addEventListener("wheel", (e) => {
      if (state.calibMode) return;
      if (document.body.classList.contains("gallery-open")) return; // galerie → nech nativní scroll
      if (!cues || !(state.duration > 0)) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastCueScrub < 110) return; // jeden krok na jeden „cvak"
      lastCueScrub = now;
      scrubByCue(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // Setup mode switcher listeners
    const btnModeText = document.getElementById("btn-mode-text");
    const btnModeComic = document.getElementById("btn-mode-comic");
    const btnModeMovie = document.getElementById("btn-mode-movie");
    const btnModeAudio = document.getElementById("btn-mode-audio");

    // Force the freshly-activated view to jump to the CURRENT audio position.
    // The mode-button click itself registers as user interaction, which makes
    // syncScrollTick suppress auto-follow for ~5s — so we snap directly here,
    // bypassing that gate (and clear the gate so live follow resumes at once).
    const snapViewToCurrentTime = () => {
      if (state.comicMode) {
        const grid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
        if (!grid) return;
        const active = grid.querySelector(".comic-panel.active");
        if (!active) return;
        const offset = centerOffsetFor(grid, active);
        if (isComicVertical()) grid.scrollTop = offset; else grid.scrollLeft = offset;
      } else {
        // Text mode: center the active paragraph instantly (no smooth)
        const el = paras[state.curIdx];
        if (!el) return;
        const barH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--ap-barH")) || 104;
        const rect = el.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - barH - Math.max(0, (window.innerHeight - barH - el.offsetHeight) / 2);
        window.scrollTo({ top: Math.max(0, targetY), behavior: "instant" });
      }
    };

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
        lastUserScrollTime = 0;                        // deliberate switch → povol auto-follow
        // Double-rAF: first frame finishes layout, second frame measures correct positions
        requestAnimationFrame(() => requestAnimationFrame(snapViewToCurrentTime));
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
        lastUserScrollTime = 0;                       // deliberate switch → povol auto-follow
        requestAnimationFrame(snapViewToCurrentTime); // naroluj strip na aktuální panel hned
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
      saveState();
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
      if (Math.abs(state.currentTime - lastSavedTime) >= 1) {
        saveState();
        lastSavedTime = state.currentTime;
      }
    });

    audio.addEventListener("play", () => {
      state.playing = true;
      resumeAudioCtx();   // po přepojení přes Web Audio drž kontext běžící (jinak ticho)
      playIcon.textContent = "❚❚";
      setBarPlayIcon(true);
      setAudioPlaying(true);
      document.body.classList.add("is-playing"); // globální play/pauza overlay (auto-hide)
      if (playBtnWrapper) playBtnWrapper.classList.add("playing");
      updateStatus();

      // Obnov přehrávání videí Z AKTUÁLNÍHO místa (pause je jen zmrazila, nevrací na začátek).
      // Vč. fullscreen videa (film) — jinak se po pauze neobnoví.
      [currentVideoEl, currentPrevEl, currentFsEl].forEach(v => { try { if (v) v.play().catch(() => {}); } catch (e) {} });
    });

    audio.addEventListener("pause", () => {
      state.playing = false;
      playIcon.textContent = "▶";
      setBarPlayIcon(false);
      setAudioPlaying(false);
      document.body.classList.remove("is-playing"); // pauza → overlay zase ukáže play
      if (playBtnWrapper) playBtnWrapper.classList.remove("playing");
      updateStatus();
      // Pauzni i videa (film/preview) — jinak hrají dál i při pauze audia.
      [currentVideoEl, nextVideoEl, currentPrevEl, nextPrevEl, currentFsEl, nextFsEl]
        .forEach(v => { try { if (v) v.pause(); } catch (e) {} });
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
            .catch(e => {
              if (e.name !== "NotAllowedError") {
                console.error("Play on interaction failed:", e);
              }
            });
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
      // Při přehrávání bez aktivního odstavce nech titulek prázdný (nikdy „FEED ACTIVE").
      setSubtitles(state.playing ? "" : "// SYSTEM STANDBY", false);
      return;
    }
    if (previewSubtitles) previewSubtitles.style.color = "var(--cyan)";

    // Využijeme komiksové časování pro naprostou synchronizaci
    const sIdx = getActiveSentenceIndex(pIdx, displayTime);
    if (sIdx === -1) {
      setSubtitles(paras[pIdx].textContent.trim(), false);
      return;
    }

    const di = paras[pIdx].dataset.i;
    const matchingPanels = document.querySelectorAll(`#comic-content-part${state.activePart} .comic-panel[data-i="${di}"]`);
    const panel = matchingPanels[sIdx];
    
    if (!panel) return;
    
    const textEl = panel.querySelector(".comic-text");
    if (!textEl) {
      setSubtitles("", false);
      return;
    }

    const panelText = textEl.textContent.trim();
    // Rozdělíme na slova pro karaoke efekt, ale zachováme přesnou větu z komiksu
    const words = panelText.split(/\s+/).filter(Boolean);
    if (!words.length) {
      setSubtitles("", false);
      return;
    }

    const tStart = cues[pIdx];
    const tEnd = (pIdx < N - 1 && cues[pIdx + 1] != null) ? cues[pIdx + 1] : state.duration;
    const pDuration = Math.max(0.1, tEnd - tStart);
    
    // Lineární rozložení v rámci celého odstavce (odpovídá logice v getActiveSentenceIndex)
    const panelDuration = pDuration / matchingPanels.length;
    const panelStartTime = tStart + (sIdx * panelDuration);
    
    const progress = Math.max(0, Math.min(1, (displayTime - panelStartTime) / panelDuration));
    const activeWordIdx = Math.max(0, Math.min(words.length - 1, Math.floor(progress * words.length)));

    const html = words
      .map((w, i) => `<span class="cin-word${i <= activeWordIdx ? " read" : ""}">${escapeHtml(w)}</span>`)
      .join(" ");
      
    setSubtitles(html, true);
  };

  const changeSentenceVideo = (part, paraIdx, sIdx) => {
    isPlayingCustom = true;
    activeParaIdx = paraIdx;
    subVideoIdx = sIdx + 1;

    const paraNum = parseInt(paraIdx) + 1;
    const di = paras[paraIdx] ? paras[paraIdx].dataset.i : paraIdx;
    const matchingPanels = document.querySelectorAll(`#comic-content-part${part} .comic-panel[data-i="${di}"]`);
    const panel = matchingPanels[sIdx];

    let src;
    let shotId;
    if (panel && panel.dataset.video) {
      src = panel.dataset.video;
      const base = src.substring(src.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
      shotId = `[${base}]`;
    } else {
      const partStr = String(part).padStart(2, '0');
      const paraStr = String(paraNum).padStart(2, '0');
      const subStr = String(sIdx + 1).padStart(2, '0');
      src = `video/dil_${part}/${partStr}_${paraStr}_${subStr}.mp4`;
      shotId = `[${partStr}_${paraStr}_${subStr}]`;
    }

    if (previewShotId) {
      previewShotId.textContent = shotId;
      previewShotId.style.color = "var(--cyan)";
    }
    if (fullscreenShotId) {
      fullscreenShotId.textContent = shotId;
    }

    nextPrevEl.loop = true; // ZAJIŠTĚNÍ NATIVNÍHO LOOPU PRO VĚTU
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
        if (e && e.name !== "AbortError") console.warn("Film video preview play error:", e.message);
      });

    if (state.fullscreenMode) {
      syncFullscreenSource(src);
    }
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
    const displayTime = state.calibMode ? state.currentTime : Math.max(0, state.currentTime - (state.comicMode ? 0.05 : 0.4));

    // 2. Identify active block index
    const activeIdx = getActiveIndex(displayTime);
    if (activeIdx !== state.curIdx) {
      state.curIdx = activeIdx;

      if (activeIdx !== -1) {
        // Hide initial poster overlays when video playback sync begins
        const previewPoster = document.getElementById("preview-poster");
        const fullscreenPoster = document.getElementById("fullscreen-poster");
        if (previewPoster) previewPoster.classList.remove("active");
        if (fullscreenPoster) fullscreenPoster.classList.remove("active");
      } else {
        isPlayingCustom = false;
      }
    }

    // Sentence-level video sync trigger
    if (activeIdx !== -1) {
      const sIdx = getActiveSentenceIndex(activeIdx, displayTime);
      if (sIdx !== -1) {
        if (activeIdx !== activeParaIdxForVideo || sIdx !== activeSentIdxForVideo) {
          // Check if this sentence (panel) has a custom video or default video
          const di = paras[activeIdx] ? paras[activeIdx].dataset.i : activeIdx;
          const matchingPanels = document.querySelectorAll(`#comic-content-part${state.activePart} .comic-panel[data-i="${di}"]`);
          const panel = matchingPanels[sIdx];
          const hasCustomVideo = !!(panel && panel.dataset.video);
          const count = getParaVideoCount(state.activePart, activeIdx);
          const hasDefaultVideo = count !== null && (sIdx + 1) <= count;

          if (hasCustomVideo || hasDefaultVideo) {
            changeSentenceVideo(state.activePart, activeIdx, sIdx);
          }
          // Update tracking variables regardless of whether a new video started or we kept the previous one running
          activeParaIdxForVideo = activeIdx;
          activeSentIdxForVideo = sIdx;
        }
      }
    }

    // Update cinematic subtitles every frame (sentence-by-sentence + word karaoke)
    updateCinemaSubtitle(activeIdx, displayTime);

    // Always run highlight update (including comic panels inside paragraphs)
    highlightParagraph(activeIdx);

    // Film SCÉNA x/N HUD
    updateFilmHud(activeIdx);

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

  // Časy začátků VĚT — odvozené proporčně podle slov v odstavci (stejná logika
  // jako kino-titulky/karaoke). Odstavec i pokrývá [cues[i], cues[i+1]] a obsahuje
  // K vět; každá věta začíná v čase tStart + (indexPrvníhoSlova / početSlov) * span.
  const buildSentenceTimes = () => {
    const out = [];
    if (!cues || !paras.length) return out;
    for (let i = 0; i < N; i++) {
      if (cues[i] == null) continue;
      const tStart = cues[i];
      const tEnd = (i < N - 1 && cues[i + 1] != null) ? cues[i + 1] : (state.duration || tStart + 4);
      const span = Math.max(0.1, tEnd - tStart);
      const words = paras[i] ? paras[i].querySelectorAll(".word") : [];
      const wc = words.length;
      out.push(tStart); // začátek odstavce = první věta
      for (let w = 0; w < wc - 1; w++) {
        if (SENTENCE_END.test((words[w].textContent || "").trim())) {
          out.push(tStart + ((w + 1) / wc) * span);
        }
      }
    }
    out.sort((a, b) => a - b);
    return out;
  };

  // Po skoku dorovnej zobrazený obsah daného režimu na aktuální čas:
  // text → vycentruj aktivní odstavec, komiks → aktivní panel. (Film/audio = overlay.)
  const centerActiveContent = (smooth = true) => {
    if (state.fullscreenMode || state.audioMode) return;
    const behavior = smooth ? "smooth" : "auto";
    if (state.comicMode) {
      const grid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
      const panel = grid ? grid.querySelector(".comic-panel.active") : null;
      if (grid && panel) {
        const off = centerOffsetFor(grid, panel);
        if (isComicVertical()) grid.scrollTo({ top: off, behavior });
        else grid.scrollTo({ left: off, behavior });
      }
    } else {
      const p = paras[state.curIdx];
      if (p) {
        const rect = p.getBoundingClientRect();
        const target = Math.max(0, rect.top + window.scrollY + p.offsetHeight / 2 - window.innerHeight / 2);
        window.scrollTo({ top: target, behavior });
      }
    }
  };

  // Jednotný seek: nastaví audio na zlomek (0–1), okamžitě sync highlight/scénu/titulek
  // a dorovná obsah (komiks/text) na danou pozici. Funguje i při pauze, ve všech režimech.
  const seekToFraction = (f) => {
    if (!audio || !state.duration) return;
    const frac = Math.max(0, Math.min(1, f));
    audio.currentTime = frac * state.duration;
    state.curIdx = -1;
    state.currentTime = audio.currentTime;
    onTimeUpdate();
    centerActiveContent(false); // instant — obsah sleduje slider plynule i při tažení
    saveState();
    lastSavedTime = state.currentTime;
  };

  // Posun audio časové osy o jednu VĚTU kolečkem myši (dir: +1 vpřed, -1 zpět).
  // Funguje ve VŠECH režimech; po skoku dorovná obsah na aktuální čas.
  const scrubByCue = (dir) => {
    if (!cues || !(state.duration > 0)) return;
    const times = buildSentenceTimes();
    if (!times.length) return;
    const t = audio.currentTime;
    // Index aktuální věty = největší čas <= pozice (s tolerancí, ať „na začátku věty" = ta věta).
    // Skok o CELOU větu: dir +1 → další věta, dir -1 → předchozí věta.
    let idx = -1; // -1 = před první větou (díly II/III mají první cue až ~10 s)
    for (let i = 0; i < times.length; i++) { if (times[i] <= t + 0.25) idx = i; else break; }
    idx = Math.max(0, Math.min(times.length - 1, idx + (dir > 0 ? 1 : -1)));
    const target = times[idx];
    audio.currentTime = Math.max(0, Math.min(state.duration, target));
    state.curIdx = -1;          // vynuť re-highlight
    state.currentTime = audio.currentTime;
    onTimeUpdate();             // okamžitá synchronizace slideru/scény/titulku (i při pauze)
    centerActiveContent();      // dorovnej text/komiks na aktuální čas
    saveState();
    lastSavedTime = state.currentTime;
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
    activeWordEl = words[activeWordIdx]; // pro per-řádkové centrování textu

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
          // Scrolling is driven continuously by the rAF loop (syncScrollTick,
          // cue-anchored), so we only need to mark the active panel here.
        }
      }
    }

    // Dim chapter hero when a paragraph becomes active
    const hero = document.getElementById(`chapter-hero-${state.activePart}`);
    if (hero) {
      if (idx >= 0) {
        hero.classList.add("dimmed");
      } else {
        hero.classList.remove("dimmed");
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
  // Komiks: ease-in tween 200ms (pomalý start → rychlý konec).
  const COMIC_GLIDE_MS = 200;
  let comicTween = { from: 0, target: null, start: 0 };

  const syncScrollTick = () => {
    comicRAF = requestAnimationFrame(syncScrollTick);
    if (state.restoring || !state.playing || state.calibMode || state.fullscreenMode || state.audioMode) return;
    if (Date.now() - lastUserScrollTime < AUTO_SCROLL_INACTIVITY_MS) return;

    const displayTime = Math.max(0, state.currentTime - 0.4);

    if (state.comicMode) {
      const grid = document.querySelector(`#comic-content-part${state.activePart} .comic-grid`);
      if (!grid) return;
      const active = grid.querySelector(".comic-panel.active");
      if (!active) return;
      const vertical = isComicVertical();
      const desired = centerOffsetFor(grid, active);
      // Spusť nový tween vždy, když se cíl změní
      if (comicTween.target == null || Math.abs(desired - comicTween.target) > 1) {
        comicTween.from  = vertical ? grid.scrollTop : grid.scrollLeft;
        comicTween.target = desired;
        comicTween.start  = Date.now();
      }
      const p = Math.min(1, (Date.now() - comicTween.start) / COMIC_GLIDE_MS);
      const eased = p * p * p; // ease-in: pomalý start, rychlý konec
      const pos = comicTween.from + (comicTween.target - comicTween.from) * eased;
      if (vertical) grid.scrollTop = pos; else grid.scrollLeft = pos;
    } else {
      // TEXT: drž AKTIVNÍ SLOVO uprostřed stránky. Scrolluj jen když slovo
      // opustí střed o víc než ~3/4 řádku (tj. zalomí na nový řádek, nebo po
      // ručním scrollu) — okamžitý skok, NE plynulé posouvání.
      const w = activeWordEl;
      if (!w || !w.isConnected) return;
      const rect = w.getBoundingClientRect();
      if (rect.height === 0) return; // skryté slovo
      const wordCenter = rect.top + rect.height / 2;
      const pageCenter = window.innerHeight / 2;
      if (Math.abs(wordCenter - pageCenter) > rect.height * 0.75) {
        const target = Math.max(0, rect.top + window.scrollY + rect.height / 2 - pageCenter);
        window.scrollTo(0, target); // instant — diskrétní skok po řádcích
      }
    }
  };
  comicRAF = requestAnimationFrame(syncScrollTick);

  window.addEventListener("resize", () => { invalidateComicTimelines(); measureBarHeight(); });
  window.addEventListener("load", measureBarHeight);
  measureBarHeight();
  requestAnimationFrame(measureBarHeight);

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
  let activeParaIdxForVideo = -1;
  let activeSentIdxForVideo = -1;

  // Počet videí na odstavec (1-based dle pořadí v názvu souboru _NN.mp4).
  // Díky tomu umíme po posledním videu odstavce čistě skočit zpět na první
  // (loop v rámci odstavce) bez načítání neexistujícího souboru, který by
  // jinak vyvolal error event a viditelný záblesk/pauzu.
  const PART_VIDEO_COUNTS = {
    1: [2, 5, 3, 1, 3, 4, 8, 2, 3, 2, 2, 1, 3, 3, 2, 2, 5, 4, 4, 1],
    2: [3, 2, 3, 2, 1, 1, 2, 3, 2, 2, 2, 2],
    3: [3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2],
  };

  const getParaVideoCount = (part, paraIdx) => {
    // paraIdx je LOKÁLNÍ index odstavce v rámci dílu (0-based) — stejně jako
    // v startParagraphVideoChain. PART_VIDEO_COUNTS jsou indexované lokálně.
    const relIdx = parseInt(paraIdx);
    const arr = PART_VIDEO_COUNTS[part];
    if (arr && relIdx >= 0 && relIdx < arr.length) return arr[relIdx];
    return null; // neznámý počet → fallback na chování řízené error eventem
  };

  const getActiveSentenceIndex = (pIdx, displayTime) => {
    if (pIdx < 0 || !paras[pIdx] || !cues) return -1;
    const di = paras[pIdx].dataset.i;
    const matchingPanels = document.querySelectorAll(`#comic-content-part${state.activePart} .comic-panel[data-i="${di}"]`);
    if (matchingPanels.length === 0) return -1;
    
    const tStart = cues[pIdx];
    const tEnd = (pIdx < N - 1 && cues[pIdx + 1] != null) ? cues[pIdx + 1] : state.duration;
    const pDuration = Math.max(0.1, tEnd - tStart);
    const progress = Math.max(0, Math.min(1, (displayTime - tStart) / pDuration));
    
    return Math.max(0, Math.min(matchingPanels.length - 1, Math.floor(progress * matchingPanels.length)));
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
        teaserVid.src = getVideoPath(`video/teaser_${state.activePart}.mp4`);
        teaserVid.play().catch(e => {
          if (e.name !== "AbortError" && e.name !== "NotAllowedError") {
            console.log("Teaser autoplay prevented", e);
          }
        });
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
    // paraIdx je LOKÁLNÍ index odstavce (0-based) — stejně jako startParagraphVideoChain.
    const paraNum = parseInt(paraIdx) + 1; // 1-based číslo odstavce v názvu souboru
    const di = paras[paraIdx] ? paras[paraIdx].dataset.i : paraIdx;
    const matchingPanels = document.querySelectorAll(`#comic-content-part${part} .comic-panel[data-i="${di}"]`);
    const panel = matchingPanels[subIdx - 1];

    let src;
    let shotId;
    if (panel && panel.dataset.video) {
      src = panel.dataset.video;
      const base = src.substring(src.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
      shotId = `[${base}]`;
    } else {
      const partStr = String(part).padStart(2, '0');
      const paraStr = String(paraNum).padStart(2, '0');
      const subStr = String(subIdx).padStart(2, '0');
      src = `video/dil_${part}/${partStr}_${paraStr}_${subStr}.mp4`;
      shotId = `[${partStr}_${paraStr}_${subStr}]`;
    }
    
    if (previewShotId) {
      previewShotId.textContent = shotId;
      previewShotId.style.color = "var(--cyan)";
    }
    if (fullscreenShotId) {
      fullscreenShotId.textContent = shotId;
    }

    // Play in preview video
    videoEl.loop = true;
    videoEl.src = getVideoPath(src);
    videoEl.load();
    videoEl.play().catch(e => {
      // AbortError = play() přerušeno novým load() při rychlém přepnutí — benigní, neloguj.
      if (e && e.name !== "AbortError") console.warn(`Video ${src}:`, e.message);
    });

    // Mirror to fullscreen if overlay is active
    if (state.fullscreenMode) {
      syncFullscreenSource(src);
    }
  };

  const syncFullscreenSource = (src) => {
    nextFsEl.loop = true;
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
    const di = paras[paraIdx] ? paras[paraIdx].dataset.i : paraIdx;
    const matchingPanels = document.querySelectorAll(`#comic-content-part${part} .comic-panel[data-i="${di}"]`);
    const firstPanel = matchingPanels[0];

    let src;
    let shotId;
    if (firstPanel && firstPanel.dataset.video) {
      src = firstPanel.dataset.video;
      const base = src.substring(src.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
      shotId = `[${base}]`;
    } else {
      const partStr = String(part).padStart(2, '0');
      const paraStr = String(paraNum).padStart(2, '0');
      src = `video/dil_${part}/${partStr}_${paraStr}_01.mp4`;
      shotId = `[${partStr}_${paraStr}_01]`;
    }

    if (previewShotId) {
      previewShotId.textContent = shotId;
      previewShotId.style.color = "var(--cyan)";
    }
    if (fullscreenShotId) {
      fullscreenShotId.textContent = shotId;
    }

    nextPrevEl.loop = true;
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
        // Běžné přerušení play() při výměně src (AbortError) — ticho.
        if (e && e.name !== "AbortError") console.warn("Film video:", e.message);
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
    nextVideoEl.loop = false;
    nextVideoEl.src = getVideoPath(src);
    nextVideoEl.load();
    nextVideoEl.play().catch(e => console.error("BG video play failed:", e));

    if (!isPlayingCustom && state.activePart !== 3) {
      if (previewShotId) {
        previewShotId.textContent = "[BG_ROTATION]";
        previewShotId.style.color = "var(--muted)";
      }
      if (nextPrevEl) {
        nextPrevEl.loop = false;
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
    // Galerie jako samostatný view (fixed overlay) — toggle přes body.gallery-open
    const btnGallery = document.getElementById("btn-nav-gallery");
    const galleryView = document.getElementById("gallery-view");
    const closeGallery = () => document.body.classList.remove("gallery-open");
    if (btnGallery) {
      btnGallery.addEventListener("click", () => {
        document.body.classList.toggle("gallery-open");
        if (galleryView && document.body.classList.contains("gallery-open")) galleryView.scrollTop = 0;
      });
    }
    const btnGalleryClose = document.getElementById("gallery-close-btn");
    if (btnGalleryClose) btnGalleryClose.addEventListener("click", closeGallery);
    // přepnutí verze zavře galerii (dotaz přes ID — mode tlačítka se vážou až v init() po tomto callu)
    ["btn-mode-text", "btn-mode-comic", "btn-mode-movie", "btn-mode-audio"].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.addEventListener("click", closeGallery);
    });
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
      saveState();
      lastSavedTime = 0;
    });
    if (barScrub) {
      const fracFromEvent = (e) => {
        const r = barScrub.getBoundingClientRect();
        const cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        return (cx - r.left) / r.width;
      };
      let scrubbing = false;
      barScrub.addEventListener("pointerdown", (e) => {
        scrubbing = true;
        try { barScrub.setPointerCapture(e.pointerId); } catch (err) {}
        seekToFraction(fracFromEvent(e)); // seek + obsah (komiks/text) se dorovná
      });
      barScrub.addEventListener("pointermove", (e) => { if (scrubbing) seekToFraction(fracFromEvent(e)); });
      const endScrub = () => { scrubbing = false; };
      barScrub.addEventListener("pointerup", endScrub);
      barScrub.addEventListener("pointercancel", endScrub);
    }
    // Tlačítka ◀ ▶ — posun po větách (náhrada kolečka, hlavně pro mobil)
    const btnPrev = document.getElementById("bar-prev");
    const btnNext = document.getElementById("bar-next");
    if (btnPrev) btnPrev.addEventListener("click", () => scrubByCue(-1));
    if (btnNext) btnNext.addEventListener("click", () => scrubByCue(1));

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
      teaserVid.src = getVideoPath(`video/teaser_${state.activePart}.mp4`);
      teaserVid.play().catch(e => {
        if (e.name !== "AbortError" && e.name !== "NotAllowedError") {
          console.log("Teaser autoplay prevented", e);
        }
      });
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
    saveState();
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
    saveState();
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
    const di = paras[paraIdx] ? paras[paraIdx].dataset.i : paraIdx;
    const matchingPanels = document.querySelectorAll(`#comic-content-part${part} .comic-panel[data-i="${di}"]`);
    const panel = matchingPanels[subIdx - 1];

    let src;
    if (panel && panel.dataset.video) {
      src = panel.dataset.video;
    } else {
      const partStr = String(part).padStart(2, '0');
      const paraStr = String(paraNum).padStart(2, '0');
      const subStr = String(subIdx).padStart(2, '0');
      src = `video/dil_${part}/${partStr}_${paraStr}_${subStr}.mp4`;
    }
    
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
    seekToFraction((e.clientX - rect.left) / rect.width); // seek + dorovnání obsahu
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
