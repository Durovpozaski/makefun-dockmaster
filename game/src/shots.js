// Screenshot staging: builds a fixed, deterministic game state for each
// of the four submitted screenshots, using only the sim's own functions
// and state fields, then the renderer draws it. Every shot is a real
// render of the game's own code at 1280x720.
import { newRun, startRun, applyUpgrade, hookSpeed } from './sim.js';
import { SHIP_PLAN } from './config.js';

function fillShipSlots(state, count) {
  let n = 0;
  for (let i = 0; i < state.ship.slots.length && n < count; i++) {
    state.ship.slots[i].filled = true;
    state.ship.slots[i].placedColor = state.ship.slots[i].color;
    n++;
  }
}

export function stageShot(state, name) {
  if (name === 'start') {
    // Title screen over a fresh run (difficulty Breezy selected).
    const fresh = newRun('breezy', 1);
    Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
    state.screen = 'title';
    state.best = 8450;
    return;
  }

  startRun(state, 'breezy', 1);
  state.screen = 'play';
  if (name === 'play') {
    // Boss ship MV BADAI, mid-action: crane lifting two containers,
    // timer in the red, five of eight slots filled, combo x4.
    for (let s = 0; s < 6; s++) {
      // Play through ships 1-6 quickly by marking them sailed.
      state.stats.shipsLoaded = s;
      state.perShipScores.push(1850 + s * 320);
    }
    // Rebuild as ship 7: fresh run state, then force ship 7.
    const fresh = newRun('breezy', 1);
    Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
    startRun(state, 'breezy', 1);
    state.stats.shipsLoaded = 6;
    state.perShipScores = [1850, 2170, 2490, 2810, 3130, 3450];
    state.score = 15400;
    state.combo = 12;
    state.best = 14800;
    // Jump to ship 7 by simulating six sailed ships via direct setup.
    state.shipIndex = 6;
    const plan = SHIP_PLAN[6];
    const colours = ['red', 'blue', 'yellow', 'green', 'red', 'blue', 'yellow', 'green'];
    state.ship = {
      name: 'MV BADAI',
      slots: colours.map((c, i) => ({ color: c, filled: i < 5, placedColor: i < 5 ? c : undefined, wild: false })),
      timer: 23,
      total: 70,
      boss: true,
    };
    state.wind = 1.0;
    state.shipSlide = 1;
    state.shipSlideOffset = 0;
    state.screen = 'play';
    state.crane.x = 880;
    state.crane.len = 300;
    state.crane.carrying = ['yellow', 'green'];
    state.berths[0].stack = ['red', 'blue'];
    state.berths[1].stack = ['green'];
    state.berths[2].stack = ['yellow', 'red'];
    state.berths[3].stack = ['blue'];
    state.nextQueue = ['red', 'green', 'blue', 'yellow', 'red'];
    state.banner = { txt: 'MV BADAI  —  STORM SHIP!', sub: 'Double load in a howling wind', ttl: 99 };
    state.floating.push({ x: 760, y: 380, txt: '+400', color: '#FFFFFF', ttl: 99 });
    state.floating.push({ x: 1020, y: 340, txt: 'COMBO x4!', color: '#FFD95E', ttl: 99 });
    void hookSpeed;
    return;
  }

  if (name === 'upgrade') {
    state.banner = null;
    state.best = 5200;
    state.ship.timer = 45;
    state.score = 6420;
    state.combo = 6;
    state.stats.shipsLoaded = 3;
    state.perShipScores = [1850, 2170, 2400];
    state.shipIndex = 2;
    fillShipSlots(state, 6);
    state.pendingChoices = [
      { id: 'magnet', name: 'DOUBLE MAGNET', desc: 'Hook carries 2 containers at once', icon: '🧲' },
      { id: 'hook', name: 'FAST HOOK', desc: 'Hook rises and lowers 60% faster', icon: '⚡' },
      { id: 'wind', name: 'WIND STABILIZER', desc: 'Wind sway cut to one third', icon: '🛟' },
    ];
    state.screen = 'upgrade';
    return;
  }

  if (name === 'win') {
    state.shipIndex = 6;
    fillShipSlots(state, 6);
    state.ship.timer = 12;
    state.score = 15840;
    state.best = 15840;
    state.newBest = true;
    state.winGrade = 'S';
    state.stats.shipsLoaded = 7;
    state.stats.perfectShips = 4;
    state.stats.placed = 46;
    state.stats.wrong = 2;
    state.strikes = 0;
    state.perShipScores = [1850, 2170, 2490, 2810, 3130, 3450, 4640];
    state.screen = 'win';
    return;
  }
}
