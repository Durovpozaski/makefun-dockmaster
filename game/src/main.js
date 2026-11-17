// DOCKMASTER bootstrap: canvas setup, fixed-step loop, screens wiring,
// and the debug handle the verification scripts drive the game through.
import { VIEW_W, VIEW_H } from './config.js';
import { newRun, startRun, startShip, step, applyUpgrade, grab, release, hookSpeed, swayFactor, spawnInterval, carryCap } from './sim.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7);
const shotName = params.get('shot');

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const input = createInput(canvas);
const audio = createAudio();
const state = newRun('breezy', seed);
state.audio = audio;

if (shotName) {
  stageShot(state, shotName);
  // Frozen frame: screenshots must be pixel-stable, so the sim does not
  // advance and the music never starts in a shot run.
  render(ctx, state, input);
} else {
  let last = performance.now();
  let acc = 0;
  const DT = 1 / 60;
  function frame(now) {
    try {
      const elapsed = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += elapsed;
      let guard = 0;
      while (acc >= DT && guard < 5) {
        step(state, input, audio, DT);
        acc -= DT;
        guard++;
      }
      render(ctx, state, input);
    } catch (err) {
      // One bad frame must never kill the game: log it loudly and keep
      // the loop running so the player can keep playing / restart.
      console.error('[dockmaster] frame error (loop kept alive):', err);
    }
    requestAnimationFrame(frame);
  }
  // First user gesture unlocks audio (browsers block it before that).
  window.addEventListener('pointerdown', () => { audio.ensure(); audio.startMusic(); }, { once: true });
  window.addEventListener('keydown', () => { audio.ensure(); audio.startMusic(); }, { once: true });
  requestAnimationFrame(frame);
}

// Debug handle: verification drives the real game through this object.
// state is live; step(n) advances the sim without the render loop;
// bot runs the auto-player inside the sim for full-game tests.
window.__dockmaster = {
  state,
  input,
  audio,
  version: 'dockmaster-1',
  startRun(difficulty, runSeed) { startRun(state, difficulty || 'breezy', runSeed || 1); },
  step(n) { for (let i = 0; i < (n || 1); i++) step(state, input, audio, 1 / 60); },
  setBot(on) { state.bot = !!on; },
  setTimer(s) { if (state.ship) state.ship.timer = s; },
  grab() { grab(state, audio); },
  forceShip(i) { startShip(state, i); },
  release() { release(state, audio); },
  applyUpgrade(id) { return applyUpgrade(state, id); },
  upgradeValues() {
    return {
      hookSpeed: hookSpeed(state),
      swayFactor: swayFactor(state),
      spawnInterval: spawnInterval(state),
      carryCap: carryCap(state),
      levels: { ...state.upgradeLevels },
    };
  },
  stageShot(name) { stageShot(state, name); render(ctx, state, input); },
};
