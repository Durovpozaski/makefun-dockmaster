# DOCKMASTER

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Durovpozaski/makefun-dockmaster/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Durovpozaski/makefun-dockmaster/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**DOCKMASTER** — stack the harbour, beat the clock, sail seven ships. You run the
harbour crane: lift coloured containers off the quay and stack them onto the
matching slots of each waiting ship before she sails. Load all 7 ships on
time to win; 3 late ships or 3 collapsed stacks end the shift. The final
ship is the giant **MV BADAI**, a double load in a howling storm wind.

An original 2D canvas game in English, built for make.fun's "Make the best
game" bounty. No libraries, no network requests, no copied art or code —
every line, sprite, sound and name was written for this entry.

## Run it

```sh
node serve.ts
# open http://localhost:8080/game/
```

## Controls

- **A / D** or **← / →** — move the crane (mouse steers it too)
- **S / ↓** — lower the hook
- **SPACE** or **Click** — grab / drop a container (drop it low on the quay to send it to the back of the queue)
- **1 / 2 / 3** — choose an upgrade after each ship
- **P** pause · **M** mute · **R** restart

## Features

- 7 ships with growing timers, wind and slot counts; boss ship MV BADAI
- 5 upgrades (Double Magnet, Fast Hook, Extra Berth, Wind Stabilizer, Wild Slot)
- Combo multiplier, per-ship bonuses, perfect-ship bonus, S/A/B grades
- Title, upgrade, win, lose and pause screens; best score saved locally
- Code-generated WebAudio sound effects and a quiet generative music loop

---

<sub>Entered on [make.fun](https://make.fun/?ref=tenx&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
