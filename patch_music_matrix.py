import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

matrix_code = """
  let musicMatrixRaf = null;
  const startMusicMatrix = () => {
    const wrap = document.getElementById("snd-visualizer");
    const cv = wrap ? wrap.querySelector(".snd-matrix") : null;
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d");
    
    const CORE = 4, FADE_RINGS = 2, RINGS = CORE + FADE_RINGS;
    const S = 0.62, HEXR = S * 0.88, MAXH = 6.2;
    let dpr = 1, t = 0, angle = 0, focal = 1, cx = 0, cy = 0;
    
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
      const W = Math.max(60, wrap.clientWidth), H = Math.max(60, wrap.clientHeight);
      dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      focal = cv.height * 0.8; cx = cv.width / 2; cy = cv.height * 0.5;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrap);

    const draw = () => {
      const play = !bgmAudio.paused;
      angle += play ? 0.0042 : 0.0011;
      t += play ? 0.03 : 0.014;
      
      const maxR = maxRad;
      for (let k = 0; k < HN; k++) {
        const hx = hexes[k], rad = hx.rad;
        let v;
        if (play) {
          v = 0.55 + 0.45 * Math.sin(t * 2.2 - rad * 0.85) + 0.38 * Math.sin(t * 1.3 + hx.x * 0.45) + 0.38 * Math.sin(t * 1.7 + hx.z * 0.45);
          v = v / 1.75;
          v *= 1 - (rad / (maxR * 1.6)) * 0.65;
          v *= 0.6 + 0.4 * Math.abs(Math.sin(t * 0.55));
          const edgeFloor = 0.06 + 0.12 * (rad / maxR);
          v = Math.max(edgeFloor, Math.min(1, v));
        } else {
          const ripple = Math.sin(rad * 1.0 - t * 1.5);
          const cross = Math.sin(hx.x * 0.42 + t * 0.9) * Math.sin(hx.z * 0.42 - t * 0.7);
          const swirl = Math.sin(hx.ang * 2 + rad * 0.4 - t * 1.0);
          let w = 0.38 + 0.28 * ripple + 0.20 * cross + 0.14 * swirl;
          w = w * (0.35 + 0.65 * (1 - rad / (maxR * 1.4)));
          w *= 0.72 + 0.28 * Math.sin(t * 0.35);
          const edgeFloor = 0.06 + 0.10 * (rad / maxR);
          v = Math.max(edgeFloor, Math.min(0.75, w));
        }
        tgt[k] = Number.isFinite(v) ? v : 0;
      }
      for (let k = 0; k < HN; k++) {
        const up = tgt[k] > field[k];
        field[k] += (tgt[k] - field[k]) * (up ? 0.45 : 0.12);
      }

      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(1.2), st = Math.sin(1.2);
      for (let k = 0; k < HN; k++) {
        const hx = hexes[k];
        const nx = hx.x * ca - hx.z * sa;
        const nz = hx.x * sa + hx.z * ca;
        order[k] = k;
      }
      order.sort((a, b) => {
        const ha = hexes[a], hb = hexes[b];
        const za = ha.x * sa + ha.z * ca, zb = hb.x * sa + hb.z * ca;
        return zb - za;
      });

      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = "screen";

      const proj = (x, y, z) => {
        const ry = y * ct - z * st, rz = y * st + z * ct;
        const f = focal / (focal + rz * focal * 0.08);
        return [cx + x * f * focal * 0.15 * dpr, cy - ry * f * focal * 0.15 * dpr, f];
      };

      for (let i = 0; i < HN; i++) {
        const k = order[i];
        const hx = hexes[k], hr = field[k], fd = hx.fade * hx.scale;
        const cxw = hx.x * ca - hx.z * sa, czw = hx.x * sa + hx.z * ca;
        const h = hr * MAXH;
        
        const cn = [];
        for (let c=0; c<6; c++) {
          const vx = CORN[c][0]*hx.scale, vz = CORN[c][1]*hx.scale;
          cn.push([vx*ca - vz*sa, vx*sa + vz*ca]);
        }

        const hue = 186;
        if (hr < 0.02) {
          ctx.strokeStyle = "hsla(" + hue + " 80% 50% / " + (0.3 * fd).toFixed(3) + ")";
          ctx.lineWidth = Math.max(1, dpr * 0.5);
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

        ctx.fillStyle = "hsla(" + hue + " 100% " + (58 + 14 * hr) + "% / " + ((0.22 + 0.42 * hr) * fd).toFixed(3) + ")";
        ctx.beginPath();
        for (let c = 0; c < 6; c++) { const p = proj(cxw + cn[c][0], h, czw + cn[c][1]); c ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.closePath(); ctx.fill();
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
      musicMatrixRaf = requestAnimationFrame(draw);
    };
    musicMatrixRaf = requestAnimationFrame(draw);
  };

"""

# Insert before `const showAudioStage`
content = content.replace("  const showAudioStage =", matrix_code + "\  const showAudioStage =")

# Call startMusicMatrix() at the end of DOMContentLoaded
content = content.replace("  updateBgmSelectorUI();", "  updateBgmSelectorUI();\n    startMusicMatrix();")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
