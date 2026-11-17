// DOCKMASTER renderer: draws the whole game from state on a 1280x720
// canvas. Bright daylight palette, big flat shapes, text sized to stay
// readable when the cover is scaled to 768x480.
import { VIEW_W, VIEW_H, COLOURS, colourById, SHIP_NAMES, DIFFICULTIES, DIFFICULTY_ORDER, WIN_SHIPS, MAX_STRIKES, CRANE, DOCK, SHIP, UPGRADES } from './config.js';
import { slotCols, slotRect, comboMult, hookSpeed, swayFactor, spawnInterval, carryCap } from './sim.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px Arial, Helvetica, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function container(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour.fill;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = colour.dark;
  ctx.fillRect(x, y + h - 6, w, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 5, y + 5, w - 10, 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // corrugation ribs
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const rx = x + (w / 5) * i;
    ctx.beginPath();
    ctx.moveTo(rx, y + 4);
    ctx.lineTo(rx, y + h - 8);
    ctx.stroke();
  }
}

function drawSkySea(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, 470);
  sky.addColorStop(0, '#5FB4F0');
  sky.addColorStop(0.7, '#A8DCF7');
  sky.addColorStop(1, '#DFF3FF');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, 470);
  // Sun + clouds (fixed positions, seeded by nothing — they never move).
  ctx.fillStyle = '#FFDF5E';
  ctx.beginPath();
  ctx.arc(1120, 90, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [cx, cy, s] of [[220, 80, 1], [520, 130, 0.8], [820, 70, 1.1]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
    ctx.arc(cx + 28 * s, cy - 8 * s, 22 * s, 0, Math.PI * 2);
    ctx.arc(cx + 56 * s, cy, 24 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sea
  ctx.fillStyle = '#1E9E8A';
  ctx.fillRect(0, 470, VIEW_W, 250);
  ctx.fillStyle = '#25B39B';
  for (let x = 0; x < VIEW_W; x += 90) {
    ctx.fillRect(x + ((state.time * 24 + x) % 90), 486, 46, 4);
  }
  // Quay (left concrete dock)
  ctx.fillStyle = '#C9CDD2';
  ctx.fillRect(0, DOCK.groundY, 470, 120);
  ctx.fillStyle = '#A9AEB6';
  ctx.fillRect(0, DOCK.groundY, 470, 6);
  ctx.fillStyle = '#8A9098';
  for (let x = 20; x < 470; x += 60) ctx.fillRect(x, DOCK.groundY + 84, 34, 6);
  // Berth markings
  ctx.strokeStyle = '#F2C230';
  ctx.lineWidth = 3;
  for (const bx of DOCK.berthX) {
    ctx.strokeRect(bx - DOCK.containerW / 2, DOCK.groundY - 2, DOCK.containerW, 4);
  }
}

function drawShip(ctx, state) {
  if (!state.ship) return;
  const off = state.shipSlideOffset;
  const hullX0 = SHIP.hullX0 + off;
  const hullX1 = SHIP.hullX1 + off;
  // Hull
  ctx.fillStyle = '#1F3A5F';
  ctx.beginPath();
  ctx.moveTo(hullX0, SHIP.deckY);
  ctx.lineTo(hullX1, SHIP.deckY);
  ctx.lineTo(hullX1 - 30, 640);
  ctx.lineTo(hullX0 + 60, 640);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2C537E';
  ctx.fillRect(hullX0, SHIP.deckY - 8, hullX1 - hullX0, 8);
  // Bow + bridge
  ctx.fillStyle = '#F5F7FA';
  ctx.fillRect(hullX1 - 96, SHIP.deckY - 84, 84, 76);
  ctx.fillStyle = '#1F3A5F';
  ctx.fillRect(hullX1 - 88, SHIP.deckY - 76, 68, 22);
  ctx.fillStyle = '#7EC8F7';
  ctx.fillRect(hullX1 - 88, SHIP.deckY - 48, 68, 18);
  // Ship name on the hull
  text(ctx, state.ship.name, (hullX0 + hullX1) / 2 - 40, 596, 26, '#FFFFFF', 'center', 'bold');
  // Funnel
  ctx.fillStyle = state.ship.boss ? '#E4572E' : '#F2C230';
  ctx.fillRect(hullX0 + 26, SHIP.deckY - 62, 34, 54);
  ctx.fillStyle = '#1F3A5F';
  ctx.fillRect(hullX0 + 26, SHIP.deckY - 62, 34, 10);
  // Deck platform: the slot grid sits on the ship, not in the air.
  const gridCols = slotCols(state);
  const gridW = gridCols === 4 ? SHIP.bossSlotW : SHIP.slotW;
  const gridX = gridCols === 4 ? SHIP.bossGridX0 : SHIP.gridX0;
  const gridRight = gridX + gridCols * gridW + (gridCols - 1) * SHIP.slotGapX;
  ctx.fillStyle = '#C7D2DC';
  roundRect(ctx, gridX - 16, SHIP.gridY0 - 12, gridRight - gridX + 32, SHIP.deckY + 4 - (SHIP.gridY0 - 12), 6);
  ctx.fill();
  ctx.strokeStyle = '#5A636D';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Slots + placed containers
  const cols = slotCols(state);
  for (let i = 0; i < state.ship.slots.length; i++) {
    const slot = state.ship.slots[i];
    const r = slotRect(state, i);
    if (slot.filled) {
      const c = colourById(slot.placedColor || slot.color);
      container(ctx, r.x, r.y, r.w, r.h, c);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      roundRect(ctx, r.x, r.y, r.w, r.h, 5);
      ctx.fill();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = slot.wild ? '#FFD95E' : colourById(slot.color).light;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.setLineDash([]);
      const c = colourById(slot.color);
      ctx.fillStyle = c.fill;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      text(ctx, slot.wild ? '?' : slot.color[0].toUpperCase(), r.x + r.w / 2, r.y + r.h / 2 + 1, 15, '#FFFFFF', 'center');
    }
  }
  void cols;
}

function drawDock(ctx, state) {
  for (let b = 0; b < state.berths.length; b++) {
    const stack = state.berths[b].stack;
    for (let i = 0; i < stack.length; i++) {
      const y = DOCK.groundY - (i + 1) * DOCK.containerH;
      container(ctx, DOCK.berthX[b] - DOCK.containerW / 2, y, DOCK.containerW, DOCK.containerH, colourById(stack[i]));
    }
    text(ctx, 'BERTH ' + (b + 1), DOCK.berthX[b], DOCK.groundY + 34, 13, '#5A636D', 'center');
  }
  // Next containers preview
  text(ctx, 'NEXT', 40, 664, 13, '#5A636D', 'left');
  state.nextQueue.slice(0, 5).forEach((colour, i) => {
    container(ctx, 96 + i * 44, 650, 38, 28, colourById(colour));
  });
}

function drawCrane(ctx, state) {
  const sway = state.hookSway;
  const hookX = state.crane.x + sway;
  const hookY = CRANE.railY + state.crane.len;
  // Gantry legs + rail
  ctx.fillStyle = '#3D4A57';
  ctx.fillRect(46, CRANE.railY - 8, 14, 470 - CRANE.railY + 8);
  ctx.fillRect(1220, CRANE.railY - 8, 14, 470 - CRANE.railY + 8);
  ctx.fillStyle = '#F7B500';
  ctx.fillRect(40, CRANE.railY - 14, 1200, 16);
  ctx.fillStyle = '#3D4A57';
  ctx.fillRect(40, CRANE.railY - 14, 1200, 4);
  // Trolley
  ctx.fillStyle = '#E8A100';
  roundRect(ctx, state.crane.x - 46, CRANE.railY - 34, 92, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#1F3A5F';
  text(ctx, '🏗', state.crane.x, CRANE.railY - 16, 20, '#FFFFFF', 'center');
  // Cable + hook
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(state.crane.x, CRANE.railY);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(hookX, hookY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(hookX, hookY + 12, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried containers hang under the hook
  state.crane.carrying.forEach((colour, i) => {
    container(ctx, hookX - DOCK.containerW / 2, hookY + 20 + i * (DOCK.containerH + 2), DOCK.containerW, DOCK.containerH, colourById(colour));
  });
  // Wind streaks when the wind is strong
  if (state.wind > 0.4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    const dir = Math.sin(state.time * 1.5) > 0 ? 1 : -1;
    for (let i = 0; i < 5; i++) {
      const y = 140 + i * 46;
      const x = 200 + ((state.time * 260 + i * 230) % 900);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 44 * dir, y);
      ctx.stroke();
    }
  }
}

function drawHud(ctx, state) {
  // Top bar
  ctx.fillStyle = '#10233A';
  ctx.fillRect(0, 0, VIEW_W, 64);
  text(ctx, 'WIN: load 7 ships  ·  LOSE: 3 ships late', 16, 22, 17, '#FFFFFF', 'left');
  text(ctx, 'or 3 stack collapses', 16, 46, 13, '#9FB4CC', 'left');
  // Ship progress
  const shipNo = Math.max(1, state.shipIndex + 1);
  text(ctx, 'SHIP ' + shipNo + '/7', 470, 22, 20, '#FFD95E', 'left');
  const filled = state.ship ? state.ship.slots.filter((s) => s.filled).length : 0;
  const total = state.ship ? state.ship.slots.length : 6;
  text(ctx, 'LOADED ' + filled + '/' + total, 470, 46, 14, '#9FB4CC', 'left');
  // Departure timer (big, centre-right)
  const t = state.ship ? Math.max(0, state.ship.timer) : 0;
  const urgent = t <= 15;
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  text(ctx, '⛵ ' + mins + ':' + String(secs).padStart(2, '0'), 700, 32, 34, urgent ? '#FF5A4E' : '#FFFFFF', 'left');
  // Score block
  text(ctx, 'SCORE ' + state.score.toLocaleString('en-US'), 980, 22, 22, '#FFFFFF', 'left');
  text(ctx, 'BEST ' + state.best.toLocaleString('en-US') + '   COMBO x' + comboMult(state), 980, 46, 14, '#FFD95E', 'left');
  // Strikes are shown as X marks in the text below.
  text(ctx, '✕'.repeat(state.strikes) + '○'.repeat(MAX_STRIKES - state.strikes), 900, 46, 15, '#FF5A4E', 'left');
  // Owned upgrades row (bottom-right)
  let ux = 1080;
  for (const id of state.upgradesOwned) {
    const u = UPGRADES.find((x) => x.id === id);
    if (u) { text(ctx, u.icon, ux, 690, 22, '#FFFFFF', 'left'); ux += 30; }
  }
  // Controls hint on a dark band so it reads over quay and sea alike
  ctx.fillStyle = 'rgba(16,35,58,0.75)';
  ctx.fillRect(0, 694, VIEW_W, 26);
  text(ctx, 'A/D move  ·  S lower hook  ·  SPACE grab / drop  ·  P pause  ·  M mute', 640, 707, 13, '#FFFFFF', 'center');
}

function drawNextShips(ctx, state) {
  const upcoming = [];
  for (let i = state.shipIndex + 1; i < Math.min(WIN_SHIPS, state.shipIndex + 3); i++) {
    upcoming.push(SHIP_NAMES[i]);
  }
  ctx.fillStyle = 'rgba(16,35,58,0.85)';
  roundRect(ctx, 470, 76, 330, 30, 6);
  ctx.fill();
  const nextLabel = upcoming.length
    ? 'NEXT SHIP: ' + upcoming[0] + (upcoming[1] ? '   →   ' + upcoming[1] : '')
    : 'FINAL SHIP — MV BADAI';
  text(ctx, nextLabel, 486, 92, 14, '#FFFFFF', 'left');
}

function drawFloating(ctx, state) {
  for (const f of state.floating) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.ttl));
    ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(16,35,58,0.9)';
    ctx.strokeText(f.txt, f.x, f.y);
    text(ctx, f.txt, f.x, f.y, 22, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, state) {
  if (!state.banner) return;
  ctx.globalAlpha = Math.min(1, state.banner.ttl);
  ctx.fillStyle = 'rgba(16,35,58,0.88)';
  roundRect(ctx, 340, 200, 600, 84, 10);
  ctx.fill();
  text(ctx, state.banner.txt, 640, 228, 30, '#FFD95E', 'center');
  text(ctx, state.banner.sub, 640, 262, 16, '#FFFFFF', 'center');
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, state, input) {
  ctx.fillStyle = 'rgba(16,35,58,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#10233A';
  roundRect(ctx, 190, 60, 900, 600, 14);
  ctx.fill();
  text(ctx, 'DOCKMASTER', 640, 130, 72, '#FFD95E', 'center');
  text(ctx, 'Stack the harbour. Beat the clock. Sail seven ships.', 640, 178, 20, '#FFFFFF', 'center');
  // Feature list
  const features = [
    '✓  Load 7 ships — match container colours to ship slots',
    '✓  Pick 1 of 3 upgrades after every ship',
    '✓  Boss ship MV BADAI: double load in a storm',
    '✓  Wind, timers and late ships — 3 strikes and the shift ends',
  ];
  features.forEach((f, i) => text(ctx, f, 250, 226 + i * 28, 17, '#DCE9F5', 'left'));
  // How to play
  text(ctx, 'HOW TO PLAY', 250, 356, 18, '#FFD95E', 'left');
  const how = [
    'A / D or ← / →  —  move the crane      Mouse  —  steer the crane',
    'S / ↓  —  lower the hook      SPACE or Click  —  grab / drop a container',
    'Drop on the matching slot colour. Wrong slot sends it back; a filled slot collapses!',
    'Drop a spare container on the quay to send it to the back of the queue.',
    '1 / 2 / 3  —  choose an upgrade      P pause      M mute',
  ];
  how.forEach((h, i) => text(ctx, h, 250, 386 + i * 26, 15, '#FFFFFF', 'left'));
  // Ships list
  text(ctx, 'THE SEVEN SHIPS', 250, 520, 18, '#FFD95E', 'left');
  text(ctx, 'MV PELICAN · MV CORAL · SS HARBOUR LIGHT · MV SEAGULL · SS TIDAL · MV ANCHOR · MV BADAI ★', 250, 546, 14, '#9FB4CC', 'left');
  // Difficulty buttons
  input.clickRects.length = 0;
  DIFFICULTY_ORDER.forEach((key, i) => {
    const d = DIFFICULTIES[key];
    const x = 250 + i * 210;
    const y = 566;
    const selected = state.difficulty === key;
    ctx.fillStyle = selected ? '#F2C230' : '#24395A';
    roundRect(ctx, x, y, 190, 44, 8);
    ctx.fill();
    text(ctx, d.label, x + 95, y + 16, 18, selected ? '#10233A' : '#FFFFFF', 'center');
    text(ctx, d.desc, x + 95, y + 34, 11, selected ? '#10233A' : '#9FB4CC', 'center');
    input.clickRects.push({ kind: 'difficulty', x, y, w: 190, h: 44 });
  });
  // Start button (drawn last so it sits on top of the panel)
  drawStartButton(ctx, input);
  text(ctx, 'BEST SCORE: ' + state.best.toLocaleString('en-US'), 640, 692, 14, '#9FB4CC', 'center');
}

function drawStartButton(ctx, input) {
  // (kept as its own function so the title layout stays readable)
  ctx.fillStyle = '#2FA84F';
  roundRect(ctx, 470, 620, 340, 52, 10);
  ctx.fill();
  text(ctx, '▶  START SHIFT', 640, 647, 24, '#FFFFFF', 'center');
  // Replace the placeholder start rect with the real one.
  const rects = input.clickRects;
  for (let i = rects.length - 1; i >= 0; i--) {
    if (rects[i].kind === 'start') rects.splice(i, 1);
  }
  rects.push({ kind: 'start', x: 470, y: 620, w: 340, h: 52 });
}

function drawUpgrade(ctx, state, input) {
  ctx.fillStyle = 'rgba(16,35,58,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SHIP ' + (state.shipIndex + 1) + ' LOADED — CHOOSE 1 OF 3', 640, 150, 34, '#FFD95E', 'center');
  text(ctx, 'Press 1 / 2 / 3 or click a card', 640, 190, 17, '#FFFFFF', 'center');
  input.clickRects.length = 0;
  state.pendingChoices.forEach((u, i) => {
    const x = 190 + i * 310;
    const y = 230;
    ctx.fillStyle = '#F5F7FA';
    roundRect(ctx, x, y, 280, 260, 12);
    ctx.fill();
    ctx.fillStyle = '#10233A';
    text(ctx, u.icon, x + 140, y + 56, 44, '#10233A', 'center');
    text(ctx, u.name, x + 140, y + 118, 21, '#10233A', 'center');
    // wrap description
    const words = u.desc.split(' ');
    let line = '';
    let ly = y + 158;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 26) {
        text(ctx, line.trim(), x + 140, ly, 15, '#3D4A57', 'center', 'normal');
        ly += 22;
        line = w;
      } else line += ' ' + w;
    }
    text(ctx, line.trim(), x + 140, ly, 15, '#3D4A57', 'center', 'normal');
    text(ctx, '[' + (i + 1) + ']', x + 140, y + 228, 16, '#2FA84F', 'center');
    input.clickRects.push({ kind: 'choice', index: i, x, y, w: 280, h: 260 });
  });
  // Owned upgrades
  text(ctx, 'OWNED: ' + (state.upgradesOwned.map((id) => UPGRADES.find((u) => u.id === id).name).join('  ·  ') || 'none yet'), 640, 540, 15, '#FFFFFF', 'center');
}

function drawEnd(ctx, state, input, won) {
  ctx.fillStyle = 'rgba(16,35,58,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#10233A';
  roundRect(ctx, 240, 70, 800, 580, 14);
  ctx.fill();
  if (won) {
    // Gold grade circle
    ctx.fillStyle = '#F2C230';
    ctx.beginPath();
    ctx.arc(640, 168, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, state.winGrade || 'A', 640, 170, 56, '#10233A', 'center');
    text(ctx, 'ALL 7 SHIPS SAILED!', 640, 256, 34, '#FFD95E', 'center');
    text(ctx, 'FINAL SCORE  ' + state.score.toLocaleString('en-US'), 640, 306, 30, '#FFFFFF', 'center');
    if (state.newBest) {
      ctx.fillStyle = '#E4572E';
      roundRect(ctx, 540, 326, 200, 34, 8);
      ctx.fill();
      text(ctx, '★ NEW BEST ★', 640, 344, 18, '#FFFFFF', 'center');
    }
  } else {
    text(ctx, 'SHIFT OVER', 640, 168, 48, '#FF5A4E', 'center');
    text(ctx, state.loseReason, 640, 220, 18, '#FFFFFF', 'center');
    text(ctx, 'SCORE  ' + state.score.toLocaleString('en-US'), 640, 262, 26, '#FFFFFF', 'center');
  }
  // Stats
  const stats = [
    'Ships loaded: ' + state.stats.shipsLoaded + ' / 7',
    'Perfect ships: ' + state.stats.perfectShips,
    'Containers placed: ' + state.stats.placed,
    'Wrong drops: ' + state.stats.wrong,
    'Strikes: ' + state.strikes + ' / ' + MAX_STRIKES,
  ];
  stats.forEach((s, i) => text(ctx, s, 340, 396 + i * 26, 17, '#DCE9F5', 'left'));
  // Per-ship score graph
  text(ctx, 'SCORE PER SHIP', 760, 396, 16, '#FFD95E', 'left');
  const max = Math.max(1, ...state.perShipScores);
  state.perShipScores.forEach((v, i) => {
    const bw = 26;
    const bh = Math.max(6, (v / max) * 110);
    const x = 760 + i * 34;
    const y = 520 - bh;
    ctx.fillStyle = '#2FA84F';
    ctx.fillRect(x, y, bw, bh);
    text(ctx, String(i + 1), x + bw / 2, 534, 12, '#9FB4CC', 'center');
  });
  text(ctx, 'NEXT GOAL: beat ' + state.best.toLocaleString('en-US') + ' — grade S needs 12,000 with no strikes', 640, 566, 14, '#9FB4CC', 'center');
  // Restart button
  ctx.fillStyle = '#2FA84F';
  roundRect(ctx, 470, 592, 340, 52, 10);
  ctx.fill();
  text(ctx, '↻  PLAY AGAIN  (R)', 640, 619, 22, '#FFFFFF', 'center');
  input.clickRects.length = 0;
  input.clickRects.push({ kind: 'restart', x: 470, y: 592, w: 340, h: 52 });
}

function drawPause(ctx, state) {
  ctx.fillStyle = 'rgba(16,35,58,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', 640, 320, 54, '#FFFFFF', 'center');
  text(ctx, 'P / Esc to resume  ·  M mute  ·  R restart shift', 640, 380, 18, '#DCE9F5', 'center');
}

export function render(ctx, state, input) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawSkySea(ctx, state);
  if (state.screen !== 'title') {
    drawShip(ctx, state);
    drawDock(ctx, state);
    drawCrane(ctx, state);
    drawHud(ctx, state);
    drawNextShips(ctx, state);
    drawFloating(ctx, state);
    drawBanner(ctx, state);
  }
  ctx.restore();
  if (state.screen === 'title') drawTitle(ctx, state, input);
  else if (state.screen === 'upgrade') drawUpgrade(ctx, state, input);
  else if (state.screen === 'win') drawEnd(ctx, state, input, true);
  else if (state.screen === 'lose') drawEnd(ctx, state, input, false);
  else if (state.screen === 'pause') drawPause(ctx, state);
}
