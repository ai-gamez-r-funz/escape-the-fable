// Procedural canvas textures: floors, wallpaper, paintings, clock faces, written clues, symbol stickers.
import * as THREE from 'three';
import { SYMBOLS } from './symbols.js';

export const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
const shade = (hex, f) => {
  const r = Math.min(255, ((hex >> 16) & 255) * f) | 0, g = Math.min(255, ((hex >> 8) & 255) * f) | 0, b = Math.min(255, (hex & 255) * f) | 0;
  return `rgb(${r},${g},${b})`;
};

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function drawSymbol(g, id, cx, cy, size, color) {
  const s = SYMBOLS[id];
  if (!s) return;
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 24, size / 24);
  g.fillStyle = color || s.color;
  g.fill(new Path2D(s.path), 'evenodd');
  g.restore();
}

// white round sticker carrying a lock's symbol
function sticker(g, id, cx, cy, r) {
  g.fillStyle = '#f6f1e2'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = '#3a2d1c'; g.lineWidth = Math.max(2, r * 0.08); g.stroke();
  drawSymbol(g, id, cx, cy, r * 1.25);
}
export const symbolTex = (id) => canvasTex(128, 128, (g) => sticker(g, id, 64, 64, 58));

export function floorTex(style, pal, w, d, rng) {
  if (style === 'checker') {
    return canvasTex(256, 256, (g) => {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        g.fillStyle = css((x + y) % 2 ? pal.floorB : pal.floor); g.fillRect(x * 128, y * 128, 128, 128);
        g.fillStyle = 'rgba(0,0,0,0.05)';
        for (let i = 0; i < 60; i++) g.fillRect(x * 128 + rng.next() * 128, y * 128 + rng.next() * 128, 2, 2);
      }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128);
    }, [w / 1.2, d / 1.2]);
  }
  return canvasTex(512, 512, (g) => {
    const rows = 8, h = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rng.next() * 200;
      while (x < 512) {
        const len = 160 + rng.next() * 200;
        g.fillStyle = shade(rng.chance(0.5) ? pal.floor : pal.floorB, 0.9 + rng.next() * 0.22);
        g.fillRect(x, r * h, len, h);
        g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const yy = r * h + 6 + rng.next() * (h - 12); g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + 5, x + len * 0.6, yy - 5, x + len, yy); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, r * h, 2, h);
        x += len;
      }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, r * h, 512, 2);
    }
  }, [w / 2.4, d / 2.4]);
}

export function wallTex(style, pal, len, rng) {
  const base = css(pal.wall);
  return canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    if (style === 'stripes') { g.fillStyle = shade(pal.wall, 1.12); for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 30, 256); g.fillStyle = shade(pal.wall, 0.86); for (let x = 30; x < 256; x += 64) g.fillRect(x, 0, 3, 256); }
    else if (style === 'diamond') {
      g.strokeStyle = shade(pal.wall, 1.25); g.lineWidth = 3;
      for (let i = -256; i < 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); }
      g.fillStyle = css(pal.accent); for (let y = 0; y <= 256; y += 64) for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.arc(x + 32, y, 4, 0, 7); g.fill(); }
    } else if (style === 'panels') {
      g.strokeStyle = shade(pal.wall, 0.75); g.lineWidth = 4; g.strokeRect(0, 0, 256, 256);
      g.fillStyle = shade(pal.wall, 0.82); for (let y = 24; y < 256; y += 29) for (let x = 24; x < 256; x += 29) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
    } else if (style === 'tiles') {
      g.strokeStyle = shade(pal.wall, 0.8); g.lineWidth = 3;
      for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 128) g.strokeRect(x + ((y / 64) % 2 ? 64 : 0) - 128, y, 128, 64), g.strokeRect(x + ((y / 64) % 2 ? 64 : 0), y, 128, 64);
    } else if (style === 'rivets') {
      g.strokeStyle = shade(pal.wall, 0.86); g.lineWidth = 3; g.strokeRect(0, 0, 256, 256);
      g.fillStyle = shade(pal.wall, 0.8); for (let i = 16; i < 256; i += 32) { g.beginPath(); g.arc(i, 10, 4, 0, 7); g.arc(i, 246, 4, 0, 7); g.fill(); g.beginPath(); g.arc(10, i, 4, 0, 7); g.arc(246, i, 4, 0, 7); g.fill(); }
    }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rng.chance(0.5) ? '255,255,255' : '0,0,0'},0.03)`; g.fillRect(rng.next() * 256, rng.next() * 256, 3, 3); }
  }, [len / 1.3, 2.3]);
}

// Geometric mid-century carpet designs in the room's palette.
export function rugTex(pal, rng, round) {
  const [a, b, c] = pal.rug.map(css), ink = '#2b2118', cols = [a, b, c, css(pal.accent)];
  const W = round ? 400 : 512, H = round ? 400 : 356;
  return canvasTex(W, H, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    if (round) {
      const kind = rng.int(0, 2);
      if (kind === 0) [190, 150, 112, 76, 40].forEach((r, i) => { g.fillStyle = cols[(i + 1) % 3]; g.beginPath(); g.arc(200, 200, r, 0, 7); g.fill(); });
      else if (kind === 1) { for (let i = 0; i < 12; i++) { g.fillStyle = cols[1 + (i % 2)]; g.beginPath(); g.moveTo(200, 200); g.arc(200, 200, 190, (i * Math.PI) / 6, ((i + 1) * Math.PI) / 6); g.fill(); } g.fillStyle = a; g.beginPath(); g.arc(200, 200, 70, 0, 7); g.fill(); }
      else { g.fillStyle = b; g.beginPath(); g.arc(200, 200, 186, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(200, 200, 186, Math.PI * 0.75, Math.PI * 1.75); g.fill(); g.fillStyle = a; g.beginPath(); g.arc(250, 150, 60, 0, 7); g.fill(); g.fillStyle = ink; g.beginPath(); g.arc(150, 250, 34, 0, 7); g.fill(); }
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.arc(200, 200, 194, 0, 7); g.stroke();
      return;
    }
    const kind = rng.int(0, 5), m = 34;
    if (kind === 0) { // diamonds
      g.fillStyle = b; for (let i = 0; i < 5; i++) { const x = 96 + i * 80, y = h / 2; g.beginPath(); g.moveTo(x, y - 70); g.lineTo(x + 38, y); g.lineTo(x, y + 70); g.lineTo(x - 38, y); g.fill(); g.fillStyle = i % 2 ? b : c; }
    } else if (kind === 1) { // nested rectangles with an offset block
      [[m, b], [m + 34, a], [m + 60, c], [m + 96, a]].forEach(([k, col]) => { g.fillStyle = col; g.fillRect(k, k, w - 2 * k, h - 2 * k); });
      g.fillStyle = b; g.fillRect(w * 0.56, h * 0.36, w * 0.2, h * 0.28); g.fillStyle = ink; g.fillRect(w * 0.26, h * 0.43, w * 0.16, h * 0.14);
    } else if (kind === 2) { // chevrons
      g.lineWidth = 26; g.lineJoin = 'miter';
      for (let i = -1; i < 9; i++) { g.strokeStyle = cols[1 + (i & 1)]; g.beginPath(); g.moveTo(i * 68, m); g.lineTo(i * 68 + 60, h / 2); g.lineTo(i * 68, h - m); g.stroke(); }
    } else if (kind === 3) { // Bauhaus quarter-circle tiles
      const t = (h - 2 * m) / 3;
      for (let y = 0; y < 3; y++) for (let x = 0; x * t < w - 2 * m - 1; x++) {
        const px = m + x * t, py = m + y * t, q = rng.int(0, 3);
        g.fillStyle = cols[rng.int(0, 2)]; g.fillRect(px, py, t, t);
        g.fillStyle = cols[1 + ((x + y) & 1)]; g.beginPath(); const cx = px + (q & 1 ? t : 0), cy = py + (q & 2 ? t : 0); g.moveTo(cx, cy); g.arc(cx, cy, t, 0, 7); g.save(); g.beginPath(); g.rect(px, py, t, t); g.clip(); g.beginPath(); g.arc(cx, cy, t, 0, 7); g.fill(); g.restore();
      }
    } else if (kind === 4) { // bold stripes with a counter-stripe
      const n = 7, sw = (w - 2 * m) / n;
      for (let i = 0; i < n; i++) { g.fillStyle = cols[i % 3]; g.fillRect(m + i * sw, m, sw, h - 2 * m); }
      g.fillStyle = ink; g.fillRect(m, h * 0.62, w - 2 * m, 16); g.fillStyle = css(pal.accent); g.fillRect(m, h * 0.3, w - 2 * m, 10);
    } else { // lattice
      g.strokeStyle = b; g.lineWidth = 8;
      for (let i = -6; i < 12; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + h, h); g.moveTo(i * 64 + h, 0); g.lineTo(i * 64, h); g.stroke(); }
      g.fillStyle = c; for (let y = 0; y <= h; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x <= w; x += 64) { g.beginPath(); g.arc(x + 14, y + 10, 7, 0, 7); g.fill(); }
    }
    g.strokeStyle = ink; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
    g.strokeStyle = b; g.lineWidth = 7; g.strokeRect(20, 20, w - 40, h - 40);
    g.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 4; x < w; x += 9) { g.fillRect(x, 0, 3, 8); g.fillRect(x, h - 8, 3, 8); }
  });
}

// Modernist prints: hard-edged shapes and flat colour, in the spirit of the period's abstract art.
export function artTex(pal, rng, w = 260, h = 360) {
  const P = ['#d9792b', '#2f8f9c', '#d9a21b', '#c8473c', '#3d5a4a', '#2c3e50', '#e9e2cf', css(pal.accent), css(pal.fabric)];
  const ink = '#221a14', paper = rng.pick(['#efe6cf', '#f4eede', '#e6dcc4']);
  const col = () => rng.pick(P);
  return canvasTex(w, h, (g) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    const kind = rng.int(0, 5);
    if (kind === 0) { // grid of primaries
      const xs = [0, w * rng.range(0.25, 0.4), w * rng.range(0.6, 0.78), w], ys = [0, h * rng.range(0.2, 0.32), h * rng.range(0.5, 0.62), h * rng.range(0.78, 0.86), h];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { g.fillStyle = rng.chance(0.42) ? rng.pick(['#c8473c', '#d9a21b', '#2c4a8a', ink]) : paper; g.fillRect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]); }
      g.fillStyle = ink; xs.slice(1, 3).forEach((x) => g.fillRect(x - 5, 0, 10, h)); ys.slice(1, 4).forEach((y) => g.fillRect(0, y - 5, w, 10));
    } else if (kind === 1) { // overlapping discs
      g.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 6; i++) { g.fillStyle = col(); g.beginPath(); g.arc(rng.range(0.2, 0.8) * w, rng.range(0.15, 0.85) * h, rng.range(0.14, 0.34) * w, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.1, h * rng.range(0.2, 0.8)); g.lineTo(w * 0.9, h * rng.range(0.2, 0.8)); g.stroke();
    } else if (kind === 2) { // nested squares
      const base = rng.pick(['#d9792b', '#2f8f9c', '#c8473c', '#d9a21b']);
      [1, 0.78, 0.56, 0.34].forEach((k, i) => { g.fillStyle = base; g.globalAlpha = 1; g.fillRect((w - w * 0.86 * k) / 2, h * 0.14 + (h * 0.72 - w * 0.86 * k) * 0.72, w * 0.86 * k, w * 0.86 * k); g.fillStyle = i % 2 ? '#000' : '#fff'; g.globalAlpha = 0.14 * i; g.fillRect((w - w * 0.86 * k) / 2, h * 0.14 + (h * 0.72 - w * 0.86 * k) * 0.72, w * 0.86 * k, w * 0.86 * k); });
      g.globalAlpha = 1;
    } else if (kind === 3) { // paper cut-outs
      g.fillStyle = col(); g.fillRect(0, 0, w / 2, h / 2); g.fillStyle = col(); g.fillRect(w / 2, h / 2, w / 2, h / 2);
      for (let i = 0; i < 5; i++) { // leaf-like blobs
        const cx = rng.range(0.2, 0.8) * w, cy = rng.range(0.15, 0.85) * h, r = rng.range(26, 46), n = rng.int(5, 7), rot = rng.next() * 6;
        g.fillStyle = col(); g.beginPath();
        for (let k = 0; k <= n * 8; k++) { const t = (k / (n * 8)) * Math.PI * 2, rr = r * (0.62 + 0.38 * Math.cos(t * n)); g.lineTo(cx + Math.cos(t + rot) * rr, cy + Math.sin(t + rot) * rr * 1.25); }
        g.fill();
      }
    } else if (kind === 4) { // wire and shapes
      g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w * 0.15, h * 0.2);
      const pts = []; for (let i = 0; i < 5; i++) { const x = rng.range(0.15, 0.85) * w, y = rng.range(0.15, 0.85) * h; pts.push([x, y]); g.lineTo(x, y); } g.stroke();
      pts.forEach(([x, y], i) => { g.fillStyle = col(); g.beginPath(); if (i % 3 === 0) g.arc(x, y, rng.range(12, 30), 0, 7); else if (i % 3 === 1) { g.moveTo(x, y - 30); g.lineTo(x + 28, y + 22); g.lineTo(x - 28, y + 22); } else { g.ellipse(x, y, 40, 14, rng.next() * 3, 0, 7); } g.fill(); });
      g.fillStyle = ink; g.beginPath(); g.arc(w * 0.15, h * 0.2, 7, 0, 7); g.fill();
    } else { // stacked arcs: a hard-edged sun over hills
      g.fillStyle = col(); g.fillRect(0, 0, w, h * 0.62);
      g.fillStyle = paper; g.beginPath(); g.arc(w * rng.range(0.35, 0.65), h * 0.36, w * 0.22, 0, 7); g.fill();
      ['#3d5a4a', '#2c3e50', '#d9792b', ink].forEach((cc, i) => { g.fillStyle = cc; g.beginPath(); g.ellipse(w * (0.2 + 0.2 * i + rng.range(-0.1, 0.1)), h * (0.74 + i * 0.09), w * 0.6, h * 0.2, 0, Math.PI, 0); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
    }
  });
}

// Mid-century abstract paintings and simple landscapes.
export function paintingTex(pal, rng) {
  if (rng.chance(0.45)) return artTex(pal, rng, 256, 200);
  return canvasTex(256, 200, (g, w, h) => {
    const cols = ['#d9792b', '#2f8f9c', '#c9a227', '#c8473c', '#3d5a4a', '#e9e2cf', '#2c3e50', '#7c58a6'];
    const kind = rng.int(0, 2);
    if (kind === 0) { // landscape
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#e8b96a'); sky.addColorStop(1, '#f3e3c0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f6efd8'; g.beginPath(); g.arc(60 + rng.next() * 130, 60, 22, 0, 7); g.fill();
      ['#5d7a6a', '#3d5a4a', '#2a4034'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 32) g.lineTo(x, 100 + i * 28 + Math.sin(x / 40 + i * 2 + rng.next()) * 16); g.lineTo(w, h); g.fill(); });
    } else if (kind === 1) { // abstract blocks
      g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) { g.fillStyle = rng.pick(cols); g.globalAlpha = 0.9; if (rng.chance(0.5)) g.fillRect(rng.next() * 200, rng.next() * 150, 30 + rng.next() * 80, 20 + rng.next() * 70); else { g.beginPath(); g.arc(rng.next() * w, rng.next() * h, 14 + rng.next() * 34, 0, 7); g.fill(); } }
      g.globalAlpha = 1; g.strokeStyle = '#222'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(rng.next() * w, rng.next() * h); g.lineTo(rng.next() * w, rng.next() * h); g.stroke(); }
    } else { // sailing boat
      g.fillStyle = '#bcd6d9'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f6f86'; g.fillRect(0, 130, w, 70);
      g.fillStyle = '#f6efd8'; g.beginPath(); g.moveTo(128, 30); g.lineTo(128, 120); g.lineTo(70, 120); g.fill(); g.beginPath(); g.moveTo(136, 50); g.lineTo(136, 120); g.lineTo(180, 120); g.fill();
      g.fillStyle = '#7a3b2e'; g.beginPath(); g.moveTo(60, 126); g.lineTo(196, 126); g.lineTo(176, 148); g.lineTo(80, 148); g.fill();
    }
  });
}

export function viewTex(view, rng) {
  return canvasTex(256, 256, (g, w, h) => {
    if (view === 'sea') {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7fb4d6'); sky.addColorStop(0.55, '#d8ecf2'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2a6f96'; g.fillRect(0, 140, w, 116); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const y = 150 + rng.next() * 100, x = rng.next() * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y); g.stroke(); }
    } else if (view === 'hills') {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#27344f'); sky.addColorStop(1, '#c98b5a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      ['#34443c', '#232f29'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 16) g.lineTo(x, 150 + i * 36 + Math.sin(x / 36 + i * 3) * 18); g.lineTo(w, h); g.fill(); });
    } else {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#141a2e'); sky.addColorStop(1, '#3a3f5e'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        const bw = 22 + rng.next() * 26, bh = 70 + rng.next() * 130, x = i * 30 - 8;
        g.fillStyle = '#0c0f1a'; g.fillRect(x, h - bh, bw, bh);
        g.fillStyle = '#f2c661'; for (let y = h - bh + 8; y < h - 6; y += 13) for (let xx = x + 4; xx < x + bw - 5; xx += 8) if (rng.chance(0.4)) g.fillRect(xx, y, 4, 6);
      }
    }
  });
}

export function clockTex(time, symbol, rng) {
  // time "h:mm"; random harmless time when the clock is just decoration
  let [h, m] = time ? time.split(':').map(Number) : [rng.int(1, 12), rng.int(0, 11) * 5];
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#f4eeda'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.strokeStyle = '#2b2118'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.stroke();
    g.fillStyle = '#2b2118'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 94, 130 - Math.cos(a) * 94); }
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, r0 = i % 5 ? 114 : 110; g.lineWidth = i % 5 ? 1.5 : 4; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 119, 128 - Math.cos(a) * 119); g.stroke(); }
    if (symbol) sticker(g, symbol, 128, 178, 22);
    const hand = (a, len, wid) => { g.lineWidth = wid; g.lineCap = 'round'; g.beginPath(); g.moveTo(128 - Math.sin(a) * 12, 128 + Math.cos(a) * 12); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); };
    g.strokeStyle = '#1a1410';
    hand(((h % 12) + m / 60) / 12 * Math.PI * 2, 52, 9);
    hand((m / 60) * Math.PI * 2, 84, 5);
    g.fillStyle = '#b8923a'; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill();
  });
}

export function radioTex(freq, symbol, rng) {
  const f = freq || rng.int(55, 150) * 10;
  return canvasTex(384, 128, (g, w, h) => {
    g.fillStyle = '#f1e3b4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a2d1c'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#3a2d1c'; g.font = 'bold 19px Georgia, serif'; g.textAlign = 'center';
    const x = (v) => 30 + ((v - 540) / 1060) * (w - 120);
    for (let v = 600; v <= 1600; v += 200) { g.fillText(String(v), x(v), 34); g.fillRect(x(v) - 1.5, 44, 3, 18); }
    for (let v = 540; v <= 1600; v += 20) g.fillRect(x(v) - 0.5, 50, 1, 10);
    g.fillStyle = '#c8473c'; g.fillRect(x(f) - 2, 40, 4, 76);
    g.fillStyle = '#3a2d1c'; g.font = 'bold 24px Georgia, serif'; g.textAlign = 'left'; g.fillText(f + ' kc', 30, 102);
    if (symbol) sticker(g, symbol, w - 44, 64, 30);
  });
}

function wrap(g, text, maxW) {
  const out = [];
  for (const para of text) {
    let line = '';
    for (const word of String(para).split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// A written surface: paper, chalk on a blackboard, typed page. lines = clue text (or filler scribbles).
export function textTex({ w = 512, h = 384, bg = '#f3ecd8', fg = '#2b2118', font = 'Georgia, serif', lines, symbol, size = 34, rng, chalk, tiny }) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (chalk) { for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + rng.next() * 0.03})`; g.beginPath(); g.ellipse(rng.next() * w, rng.next() * h, 60 + rng.next() * 90, 14 + rng.next() * 22, rng.next() * 3, 0, 7); g.fill(); } }
    g.fillStyle = fg; g.textBaseline = 'top';
    if (lines && lines.length && tiny) {
      // tiny writing: a small dense block nobody could read without a lens
      const bw = w * 0.2, bx = w * 0.56, by = h * 0.58;
      g.globalAlpha = 0.75; for (let y = 0; y < 7; y++) g.fillRect(bx, by + y * 5, bw * (0.6 + rng.next() * 0.4), 1.6); g.globalAlpha = 1;
      sticker(g, symbol, bx - 20, by + 16, 13);
      g.globalAlpha = 0.5; g.lineWidth = 3; g.strokeStyle = fg;
      for (let y = 40; y < h * 0.5; y += 44) { g.beginPath(); let x = 30; g.moveTo(x, y); const end = w * (0.5 + rng.next() * 0.42); while (x < end) { x += 10 + rng.next() * 18; g.lineTo(x, y + (rng.next() - 0.5) * 12); } g.stroke(); }
      g.globalAlpha = 1;
    } else if (lines && lines.length) {
      const pad = symbol ? 96 : 30;
      let wrapped;
      // shrink the lettering until everything fits on the surface
      for (;; size -= 3) { g.font = `bold ${size}px ${font}`; wrapped = wrap(g, lines, w - pad - 30); if (wrapped.length * size * 1.3 <= h - 24 || size <= 15) break; }
      const lh = size * 1.3, y0 = Math.max(12, (h - wrapped.length * lh) / 2);
      wrapped.forEach((ln, i) => g.fillText(ln, pad, y0 + i * lh));
      if (symbol) sticker(g, symbol, 50, h / 2, 34);
    } else {
      g.globalAlpha = 0.55; g.lineWidth = 3; g.strokeStyle = fg;
      for (let y = 40; y < h - 30; y += 44) { g.beginPath(); let x = 30; g.moveTo(x, y); const end = w * (0.5 + rng.next() * 0.42); while (x < end) { x += 10 + rng.next() * 18; g.lineTo(x, y + (rng.next() - 0.5) * 12); } g.stroke(); }
      g.globalAlpha = 1;
    }
  });
}

export function plaqueTex(colors, symbol, palette) {
  return canvasTex(384, 96, (g, w, h) => {
    g.fillStyle = '#c9a54a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5a431a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    sticker(g, symbol, 50, 48, 34);
    colors.forEach((c, i) => { const x = 104 + i * 68; g.fillStyle = palette[c]; g.fillRect(x, 22, 50, 52); g.strokeStyle = '#2b2118'; g.lineWidth = 3; g.strokeRect(x, 22, 50, 52); if (i) { g.fillStyle = '#2b2118'; g.beginPath(); g.moveTo(x - 14, 38); g.lineTo(x - 4, 48); g.lineTo(x - 14, 58); g.fill(); } });
  });
}

export function shaftTex(kind) {
  return canvasTex(128, 196, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(255,255,255,.95)'); grad.addColorStop(1, 'rgba(255,255,255,.15)');
    g.fillStyle = grad;
    if (kind === 'round') { g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.4, h * 0.44, 0, 0, 7); g.fill(); }
    else if (kind === 'blinds') { for (let y = 10; y < h - 8; y += 15) g.fillRect(10, y, w - 20, 8); }
    else { for (const x of [10, w / 2 + 3]) for (const y of [10, h / 2 + 3]) g.fillRect(x, y, w / 2 - 13, h / 2 - 13); }
    g.filter = 'blur(3px)'; g.drawImage(g.canvas, 0, 0);
  });
}
export function signTex(text) {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#3a0c08'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a0503'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffd9cf'; g.font = 'bold 54px "Gill Sans", "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3);
  });
}

export function globeTex(rng) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#4f8fa8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9b877';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rng.next() * w, 20 + rng.next() * 88, 14 + rng.next() * 30, 8 + rng.next() * 20, rng.next() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}

export function calendarTex(rng) {
  return canvasTex(200, 280, (g, w, h) => {
    g.fillStyle = '#f3ecd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8473c'; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.fillText(rng.pick(['MARCH', 'JUNE', 'OCTOBER', 'APRIL', 'AUGUST']), w / 2, 48);
    g.fillStyle = '#2b2118'; g.font = '17px Georgia, serif';
    for (let d = 1; d <= 30; d++) g.fillText(String(d), 22 + ((d + 2) % 7) * 26, 104 + Math.floor((d + 2) / 7) * 34);
  });
}

export function wheelPlateTex(letters, symbol) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#c9a54a'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#5a431a'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#2b2118'; g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...letters].forEach((ch, i) => { const a = (i / letters.length) * Math.PI * 2; g.fillText(ch, 64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); });
    sticker(g, symbol, 64, 64, 26);
  });
}
