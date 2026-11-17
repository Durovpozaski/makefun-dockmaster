// DOCKMASTER simulation: pure game logic, no drawing, no audio calls
// except named effects. Fixed-step: step() advances exactly dt seconds,
// so the game is deterministic for a given seed and input stream.
import { COLOURS, SHIP_NAMES, SHIP_PLAN, DIFFICULTIES, WIN_SHIPS, MAX_STRIKES, CRANE, DOCK, SHIP, SCORING, UPGRADES } from './config.js';
import { makeRng, pickFrom, shuffle } from './random.js';

export function slotCols(state) {
  return state.ship.slots.length > 6 ? 4 : 3;
}
export function slotRect(state, idx) {
  const cols = slotCols(state);
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const w = cols === 4 ? SHIP.bossSlotW : SHIP.slotW;
  const x0 = cols === 4 ? SHIP.bossGridX0 : SHIP.gridX0;
  const x = x0 + col * (w + SHIP.slotGapX) + state.shipSlideOffset;
  const y = SHIP.gridY0 + row * (SHIP.slotH + SHIP.slotGapY);
  return { x, y, w, h: SHIP.slotH, col, row };
}
function berthTopY(state, b) {
  return DOCK.groundY - state.berths[b].stack.length * DOCK.containerH;
}

export function newRun(difficulty, seed) {
  const rng = makeRng(seed);
  const state = {
    screen: 'title',
    difficulty,
    seed,
    rng,
    time: 0,
    score: 0,
    best: 0,
    combo: 0,
    strikes: 0,
    lateShips: 0,
    collapses: 0,
    mistakes: 0,
    shipIndex: -1,
    ship: null,
    shipSlide: 0,
    shipSlideOffset: 600,
    departing: 0,
    berths: DOCK.berthX.map(() => ({ stack: [] })),
    nextQueue: [],
    spawnT: 0,
    crane: { x: 640, len: 0, carrying: [] },
    hookSway: 0,
    wind: 0,
    upgradesOwned: [],
    upgradeLevels: {},
    pendingChoices: [],
    floating: [],
    banner: null,
    shake: 0,
    muted: false,
    paused: false,
    bot: false,
    botTarget: null,
    botLower: false,
    botSetAside: false,
    botFallback: false,
    stats: { shipsLoaded: 0, perfectShips: 0, placed: 0, wrong: 0, startTime: 0 },
    perShipScores: [],
    shipScore: 0,
    shipMistakes: 0,
    shipOnTime: false,
    winGrade: null,
    newBest: false,
    loseReason: '',
    mouseControlT: -10,
    prevMouseX: 640,
    msg: '',
  };
  try { state.best = Number(window.localStorage.getItem('dockmaster-best') || 0); } catch (err) { state.best = 0; }
  refillQueue(state);
  return state;
}

function refillQueue(state) {
  while (state.nextQueue.length < 5) {
    state.nextQueue.push(pickFrom(state.rng, COLOURS).id);
  }
}

export function startShip(state, index) {
  const plan = SHIP_PLAN[index];
  const diff = DIFFICULTIES[state.difficulty];
  const slots = [];
  const colourPool = shuffle(state.rng, COLOURS.map((c) => c.id));
  for (let i = 0; i < plan.slots; i++) {
    slots.push({ color: colourPool[i % colourPool.length], filled: false, wild: false });
  }
  // Wild-slot upgrade: one slot per ship takes any colour.
  if ((state.upgradeLevels.wild || 0) > 0) {
    slots[Math.floor(state.rng() * slots.length)].wild = true;
  }
  state.shipIndex = index;
  state.ship = {
    name: SHIP_NAMES[index],
    slots,
    timer: plan.timer * diff.timerMult,
    total: plan.timer * diff.timerMult,
    boss: index === WIN_SHIPS - 1,
  };
  state.wind = plan.wind * diff.windMult;
  state.shipSlide = 0;
  state.shipSlideOffset = 600;
  state.shipScore = 0;
  state.shipMistakes = 0;
  state.screen = 'play';
  state.banner = { txt: state.ship.name + (state.ship.boss ? '  —  STORM SHIP!' : ''), sub: 'Load ' + plan.slots + ' containers before she sails', ttl: 2.4 };
}

export function startRun(state, difficulty, seed) {
  const fresh = newRun(difficulty, seed);
  fresh.screen = 'play';
  fresh.stats.startTime = 0;
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
  state.rng = makeRng(seed);
  // Opening dock: two containers already waiting on the quay.
  state.berths[0].stack.push('red');
  state.berths[1].stack.push('blue');
  startShip(state, 0);
}

function neededColours(state) {
  const need = {};
  if (!state.ship) return need;
  for (const s of state.ship.slots) {
    if (!s.filled && !s.wild) need[s.color] = (need[s.color] || 0) + 1;
  }
  return need;
}

function spawnContainer(state) {
  const need = neededColours(state);
  const openBerths = state.berths.map((b, i) => i).filter((i) => state.berths[i].stack.length < DOCK.maxStack);
  if (!openBerths.length) return;
  // Prefer a colour the ship still needs; fall back to the preview queue.
  let colour = null;
  const neededIds = Object.keys(need);
  if (neededIds.length && state.rng() < 0.75) {
    colour = pickFrom(state.rng, neededIds);
  } else {
    colour = state.nextQueue.shift();
    refillQueue(state);
  }
  const b = pickFrom(state.rng, openBerths);
  state.berths[b].stack.push(colour);
}

function addFloat(state, x, y, txt, color) {
  state.floating.push({ x, y, txt, color, ttl: 1.4 });
}

export function comboMult(state) {
  return 1 + Math.min(4, Math.floor(state.combo / 3));
}

function returnCarried(state) {
  for (const colour of state.crane.carrying) {
    const open = state.berths.findIndex((b) => b.stack.length < DOCK.maxStack);
    if (open >= 0) state.berths[open].stack.push(colour);
  }
  state.crane.carrying = [];
}

export function grab(state, audio) {
  const hookX = state.crane.x + state.hookSway;
  const hookY = CRANE.railY + state.crane.len;
  for (let b = 0; b < state.berths.length; b++) {
    const berth = state.berths[b];
    if (!berth.stack.length) continue;
    const topY = berthTopY(state, b);
    if (Math.abs(hookX - DOCK.berthX[b]) < CRANE.grabRadiusX && Math.abs(hookY - topY) < CRANE.grabRadiusY) {
      const cap = 1 + (state.upgradeLevels.magnet || 0);
      while (state.crane.carrying.length < cap && berth.stack.length) {
        state.crane.carrying.push(berth.stack.pop());
      }
      audio.sfx('grab');
      return true;
    }
  }
  return false;
}

function placeCarried(state, audio) {
  const hookX = state.crane.x + state.hookSway;
  const hookY = CRANE.railY + state.crane.len;
  if (hookY < SHIP.gridY0 - 20 || hookX < SHIP.hullX0 || hookX > SHIP.hullX1) return false;
  // Which slot is under the hook?
  let target = -1;
  for (let i = 0; i < state.ship.slots.length; i++) {
    const r = slotRect(state, i);
    if (hookX >= r.x - 6 && hookX <= r.x + r.w + 6 && hookY >= r.y - 10 && hookY <= r.y + r.h + 26) { target = i; break; }
  }
  if (target < 0) return false;
  const slot = state.ship.slots[target];
  const carried = state.crane.carrying.slice();
  state.crane.carrying = [];
  if (slot.filled) {
    // Stack collapse: the dropped container is lost to the sea.
    state.collapses++;
    state.strikes++;
    state.combo = 0;
    state.shake = 10;
    addFloat(state, hookX, SHIP.gridY0 - 30, 'STACK COLLAPSE!', '#E4572E');
    audio.sfx('collapse');
    for (const c of carried.slice(1)) {
      const open = state.berths.findIndex((b) => b.stack.length < DOCK.maxStack);
      if (open >= 0) state.berths[open].stack.push(c);
    }
    checkStrikes(state, audio);
    return true;
  }
  let placed = 0;
  for (const colour of carried) {
    let idx = -1;
    if (!slot.filled && (slot.wild || slot.color === colour)) idx = target;
    else {
      idx = state.ship.slots.findIndex((s) => !s.filled && (s.wild || s.color === colour));
    }
    if (idx >= 0) {
      state.ship.slots[idx].filled = true;
      state.ship.slots[idx].placedColor = colour;
      placed++;
      const gain = Math.round(SCORING.placeBase * comboMult(state) * DIFFICULTIES[state.difficulty].scoreMult);
      state.score += gain;
      state.shipScore += gain;
      state.combo++;
      state.stats.placed++;
      const r = slotRect(state, idx);
      addFloat(state, r.x + r.w / 2, r.y - 12, '+' + gain, '#FFFFFF');
    } else {
      const open = state.berths.findIndex((b) => b.stack.length < DOCK.maxStack);
      if (open >= 0) state.berths[open].stack.push(colour);
    }
  }
  if (placed > 0) {
    audio.sfx(placed > 1 ? 'perfect' : 'place');
    if (state.ship.slots.every((s) => s.filled)) sailShip(state, audio);
  } else {
    state.combo = 0;
    state.mistakes++;
    state.shipMistakes++;
    state.stats.wrong++;
    addFloat(state, hookX, SHIP.gridY0 - 30, 'WRONG COLOUR', '#E4572E');
    audio.sfx('wrong');
  }
  return true;
}

export function release(state, audio) {
  if (!state.crane.carrying.length) return;
  if (state.ship && state.shipSlide >= 1) {
    if (placeCarried(state, audio)) return;
  }
  // Set aside: dropping low over the quay sends the container to the back
  // of the queue instead of a berth, so a colour buried under useless
  // containers can surface. Without this the dock could deadlock when
  // every berth top is a colour the ship no longer needs.
  const hookX = state.crane.x + state.hookSway;
  const hookY = CRANE.railY + state.crane.len;
  if (hookY > 540 && hookX < 470) {
    for (const colour of state.crane.carrying) state.nextQueue.push(colour);
    state.crane.carrying = [];
    addFloat(state, hookX, hookY - 24, 'SET ASIDE', '#9FB4CC');
    audio.sfx('click');
    return;
  }
  returnCarried(state);
}

function sailShip(state, audio) {
  state.shipOnTime = true;
  const bonus = Math.round(Math.ceil(state.ship.timer) * SCORING.shipBonusPerSecond * DIFFICULTIES[state.difficulty].scoreMult);
  let perfect = state.shipMistakes === 0;
  state.score += bonus;
  state.shipScore += bonus;
  if (perfect) {
    state.score += SCORING.perfectShipBonus;
    state.shipScore += SCORING.perfectShipBonus;
    state.stats.perfectShips++;
  }
  state.stats.shipsLoaded++;
  state.perShipScores.push(state.shipScore);
  addFloat(state, 900, 300, 'SHIP LOADED  +' + bonus + (perfect ? '  PERFECT +500' : ''), '#2FA84F');
  audio.sfx('sail');
  state.departing = 1.0;
  state.banner = { txt: state.ship.name + ' SAILS ON TIME!', sub: 'Ship bonus +' + bonus + (perfect ? '  ·  PERFECT +500' : ''), ttl: 2.2 };
}

function nextShipOrWin(state, audio) {
  if (state.shipIndex >= WIN_SHIPS - 1) {
    state.screen = 'win';
    state.winGrade = (state.strikes === 0 && state.score >= SCORING.gradeSMin) ? 'S' : (state.strikes <= 1 ? 'A' : 'B');
    state.newBest = state.score > state.best;
    if (state.newBest) {
      state.best = state.score;
      try { window.localStorage.setItem('dockmaster-best', String(state.best)); } catch (err) { /* no storage */ }
    }
    audio.sfx('win');
    return;
  }
  // A late ship earns no upgrade: straight on to the next ship.
  if (!state.shipOnTime) {
    startShip(state, state.shipIndex + 1);
    return;
  }
  // Upgrade choice after every on-time ship.
  const available = UPGRADES.filter((u) => (state.upgradeLevels[u.id] || 0) < (u.id === 'magnet' || u.id === 'wild' ? 1 : u.id === 'wind' ? 2 : 3));
  const picks = shuffle(state.rng, available).slice(0, 3);
  state.pendingChoices = picks;
  state.screen = 'upgrade';
  audio.sfx('upgrade');
}

export function applyUpgrade(state, id) {
  if (!UPGRADES.some((u) => u.id === id)) return false;
  state.upgradeLevels[id] = (state.upgradeLevels[id] || 0) + 1;
  if (!state.upgradesOwned.includes(id)) state.upgradesOwned.push(id);
  return true;
}

// Persistent derived values: upgrades write these fields ONCE when
// applied (applyUpgrade), and the sim reads them every frame. Nothing
// here recomputes them from a base value, so a bonus can never be
// silently erased by a per-frame reset (the §4.1.1 silent-upgrade bug).
export function hookSpeed(state) {
  return CRANE.hookSpeed * (1 + 0.6 * (state.upgradeLevels.hook || 0));
}
export function swayFactor(state) {
  return Math.pow(1 / 3, state.upgradeLevels.wind || 0);
}
export function spawnInterval(state) {
  return 2.6 * Math.pow(0.6, state.upgradeLevels.berth || 0);
}
export function carryCap(state) {
  return 1 + (state.upgradeLevels.magnet || 0);
}

function checkStrikes(state, audio) {
  if (state.strikes >= MAX_STRIKES) {
    state.screen = 'lose';
    state.loseReason = state.collapses >= MAX_STRIKES ? 'Three stacks collapsed into the harbour.' : 'Three ships sailed late.';
    audio.sfx('lose');
  }
}

function botDrive(state) {
  // Auto-player used by verification only. Fetches a colour the ship
  // still needs; if no berth top matches, it sets the top container
  // aside (back of the queue) to uncover the one beneath it.
  const hookX = state.crane.x + state.hookSway;
  const hookY = CRANE.railY + state.crane.len;
  if (!state.ship || state.shipSlide < 1) { state.botTarget = null; state.botLower = false; return; }
  if (state.crane.carrying.length) {
    if (state.botSetAside) {
      state.botTarget = 445 - state.hookSway;
      if (Math.abs(hookX - 445) < 12) {
        state.botLower = true;
        if (hookY > 545) { state.botLower = false; state.botDrop = true; }
      } else state.botLower = false;
      return;
    }
    const colour = state.crane.carrying[0];
    const idx = state.ship.slots.findIndex((s) => !s.filled && (s.wild || s.color === colour));
    if (idx < 0) { state.botSetAside = true; return; }
    const r = slotRect(state, idx);
    const cx = r.x + r.w / 2;
    state.botTarget = cx - state.hookSway;
    if (Math.abs(hookX - cx) < 12) {
      state.botLower = true;
      if (hookY >= r.y + r.h - 6) { state.botLower = false; state.botDrop = true; }
    } else state.botLower = false;
    return;
  }
  const need = neededColours(state);
  let berth = -1;
  state.botFallback = false;
  for (const colour of Object.keys(need)) {
    berth = state.berths.findIndex((b) => b.stack.length && b.stack[b.stack.length - 1] === colour);
    if (berth >= 0) break;
  }
  if (berth < 0) {
    let best = -1, bestLen = 0;
    state.berths.forEach((b, i) => { if (b.stack.length > bestLen) { bestLen = b.stack.length; best = i; } });
    if (best < 0) { state.botTarget = 240; state.botLower = false; return; }
    berth = best;
    state.botFallback = true;
  }
  state.botTarget = DOCK.berthX[berth] - state.hookSway;
  if (Math.abs(hookX - DOCK.berthX[berth]) < 10) {
    state.botLower = true;
    const topY = berthTopY(state, berth);
    if (hookY >= topY - 8) {
      state.botLower = false;
      state.botGrab = true;
    }
  } else state.botLower = false;
}

export function step(state, input, audio, dt) {
  state.time += dt;
  // Floating texts and banner always age, on every screen.
  for (const f of state.floating) { f.y -= 22 * dt; f.ttl -= dt; }
  state.floating = state.floating.filter((f) => f.ttl > 0);
  if (state.banner) { state.banner.ttl -= dt; if (state.banner.ttl <= 0) state.banner = null; }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 30 * dt);

  if (input.mutePressed) {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    input.mutePressed = false;
  }

  if (state.screen === 'title') {
    if (input.startPressed) { input.startPressed = false; startRun(state, state.difficulty, (state.seed + 1) >>> 0); return; }
    // Difficulty buttons (rects registered by the renderer last frame).
    for (let i = 0; i < input.clickRects.length; i++) {
      const r = input.clickRects[i];
      if (r.kind === 'difficulty' && input.consumeClick(r)) {
        state.difficulty = DIFFICULTIES_ORDER[i] || state.difficulty;
        audio.sfx('click');
      }
      if (r.kind === 'start' && input.consumeClick(r)) {
        startRun(state, state.difficulty, (state.seed + 1) >>> 0);
        return;
      }
    }
    input.clearEdges();
    return;
  }

  if (state.screen === 'upgrade') {
    let picked = input.choicePressed;
    for (let i = 0; i < input.clickRects.length; i++) {
      const r = input.clickRects[i];
      if (r.kind === 'choice' && input.consumeClick(r)) picked = r.index;
    }
    if (picked >= 0 && picked < state.pendingChoices.length) {
      applyUpgrade(state, state.pendingChoices[picked].id);
      audio.sfx('upgrade');
      state.pendingChoices = [];
      startShip(state, state.shipIndex + 1);
    }
    input.clearEdges();
    return;
  }

  if (state.screen === 'win' || state.screen === 'lose') {
    if (input.restartPressed || input.startPressed) {
      input.clearEdges();
      startRun(state, state.difficulty, (state.seed + 1) >>> 0);
      return;
    }
    for (const r of input.clickRects) {
      if (r.kind === 'restart' && input.consumeClick(r)) {
        startRun(state, state.difficulty, (state.seed + 1) >>> 0);
        return;
      }
    }
    input.clearEdges();
    return;
  }

  if (state.screen === 'pause') {
    if (input.pausePressed) { input.pausePressed = false; state.screen = 'play'; }
    input.clearEdges();
    return;
  }

  // --- play screen ---
  if (input.pausePressed) {
    input.pausePressed = false;
    state.screen = 'pause';
    input.clearEdges();
    return;
  }

  // Ship slide-in / sail-out.
  if (state.departing > 0) {
    state.departing -= dt;
    state.shipSlideOffset = 600 * Math.max(0, state.departing);
    if (state.departing <= 0) {
      state.shipSlideOffset = 0;
      nextShipOrWin(state, audio);
      input.clearEdges();
      return;
    }
    input.clearEdges();
    return;
  }
  if (state.shipSlide < 1) {
    state.shipSlide = Math.min(1, state.shipSlide + dt * 1.4);
    state.shipSlideOffset = 600 * (1 - state.shipSlide);
  }

  // Wind sway on the hook.
  const swayAmp = state.wind * 26 * swayFactor(state);
  state.hookSway = Math.sin(state.time * 1.5) * swayAmp;

  // Crane movement: keyboard, then mouse-follow, then bot.
  const speed = CRANE.trolleySpeed;
  if (state.bot) {
    botDrive(state);
    if (state.botTarget != null) {
      const dx = state.botTarget - state.crane.x;
      const mv = Math.max(-speed * dt, Math.min(speed * dt, dx));
      state.crane.x += mv;
    }
    if (state.botGrab) {
      state.botGrab = false;
      grab(state, audio);
      if (state.botFallback) state.botSetAside = true;
    }
    if (state.botDrop) {
      state.botDrop = false;
      release(state, audio);
      state.botSetAside = false;
    }
  } else {
    if (input.left) state.crane.x -= speed * dt;
    if (input.right) state.crane.x += speed * dt;
    if (input.mouseX !== state.prevMouseX) {
      state.mouseControlT = state.time;
      state.prevMouseX = input.mouseX;
    }
    if (!input.left && !input.right && state.time - state.mouseControlT < 1.0) {
      const dx = input.mouseX - state.crane.x;
      const mv = Math.max(-speed * dt, Math.min(speed * dt, dx));
      state.crane.x += mv;
    }
  }
  state.crane.x = Math.max(CRANE.minX, Math.min(CRANE.maxX, state.crane.x));

  // Hook: down lowers, otherwise it rises back up.
  const lowering = state.bot ? state.botLower : input.down;
  if (lowering) state.crane.len = Math.min(CRANE.hookMaxLen, state.crane.len + hookSpeed(state) * dt);
  else state.crane.len = Math.max(0, state.crane.len - hookSpeed(state) * 1.3 * dt);

  if (input.grabPressed) {
    input.grabPressed = false;
    if (state.crane.carrying.length) release(state, audio);
    else grab(state, audio);
  }

  // Container spawns.
  state.spawnT += dt;
  if (state.spawnT >= spawnInterval(state)) {
    state.spawnT = 0;
    spawnContainer(state);
  }

  // Departure timer.
  if (state.ship) {
    const prev = Math.ceil(state.ship.timer);
    state.ship.timer -= dt;
    if (Math.ceil(state.ship.timer) !== prev && state.ship.timer <= 10.5 && state.ship.timer > 0) audio.sfx('tick');
    if (state.ship.timer <= 0) {
      state.ship.timer = 0;
      state.strikes++;
      state.lateShips++;
      state.combo = 0;
      addFloat(state, 900, 300, state.ship.name + ' SAILED LATE!', '#E4572E');
      audio.sfx('late');
      state.departing = 1.0;
      state.banner = { txt: state.ship.name + ' SAILED LATE', sub: 'Strike ' + state.strikes + ' of ' + MAX_STRIKES, ttl: 2.2 };
      checkStrikes(state, audio);
      if (state.screen === 'lose') { input.clearEdges(); return; }
    }
  }

  input.clearEdges();
}

// Difficulty order used by the title-screen buttons.
import { DIFFICULTY_ORDER } from './config.js';
