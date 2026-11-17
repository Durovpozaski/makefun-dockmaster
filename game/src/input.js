// Keyboard + mouse input. The simulation reads this object every step;
// edge-triggered actions (grab, pause, mute) are queued here and consumed
// by the simulation exactly once, so a held key never double-fires.
export function createInput(canvas) {
  const input = {
    left: false,
    right: false,
    down: false,
    up: false,
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    // one-shot queues, drained by the sim
    grabPressed: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    startPressed: false,
    choicePressed: -1,
    difficultyPressed: -1,
  };

  const keyMap = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'up', KeyW: 'up',
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const held = keyMap[e.code];
    if (held) {
      input[held] = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'Space') { input.grabPressed = true; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') input.pausePressed = true;
    if (e.code === 'KeyM') input.mutePressed = true;
    if (e.code === 'KeyR') input.restartPressed = true;
    if (e.code === 'Enter') input.startPressed = true;
    if (e.code === 'Digit1') input.choicePressed = 0;
    if (e.code === 'Digit2') input.choicePressed = 1;
    if (e.code === 'Digit3') input.choicePressed = 2;
  });
  window.addEventListener('keyup', (e) => {
    const held = keyMap[e.code];
    if (held) input[held] = false;
  });
  window.addEventListener('blur', () => {
    input.left = input.right = input.down = input.up = false;
  });

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPoint(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPoint(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    input.grabPressed = true;
  });
  canvas.addEventListener('mouseup', () => { input.mouseDown = false; });

  // The renderer reports clickable rects here; the sim checks mouse clicks.
  input.clickRects = [];
  input.consumeClick = function (rect) {
    if (!input.grabPressed) return false;
    if (input.mouseX >= rect.x && input.mouseX <= rect.x + rect.w &&
        input.mouseY >= rect.y && input.mouseY <= rect.y + rect.h) {
      input.grabPressed = false;
      return true;
    }
    return false;
  };
  input.clearEdges = function () {
    input.grabPressed = false;
    input.pausePressed = false;
    input.mutePressed = false;
    input.restartPressed = false;
    input.startPressed = false;
    input.choicePressed = -1;
    input.difficultyPressed = -1;
  };
  return input;
}
