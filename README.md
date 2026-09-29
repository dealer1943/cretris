# Cretris

A continuous, level-based falling-block game using rows sampled from Jack Butcher's on-chain Credits. Every level adds one 8-cell Credit row at the bottom of the 10-cell well and names its exact Credit ID and 1-based row number in the game log. The first level uses Credit #100 row 4; the second uses Credit #200 row 7. A level advances every four cleared lines, and gravity speeds up. One next piece is shown.

There are five pieces: cyan J, magenta L, yellow square, black T, and white line. Each new game starts at level 1.

## Run

```sh
npm run dev
```

Open `http://127.0.0.1:5174`. The local server relays read-only artwork requests to Ethereum PublicNode. An internet connection is required to load real Credit artwork. `npm test` runs the board logic checks.

## Controls

- Left / Right: move
- Up or X: rotate clockwise
- Z: rotate counterclockwise
- Down or Space: place immediately
- P: pause

Touch controls appear on narrow screens. Filled rows clear and the stack above falls, as in Tetris. After the stack tops out, the game-over panel shows the final level, average active time to clear a line, the share of placed pieces that cleared at least one line, and average active time from piece spawn to placement. Paused time and Credit loading time do not count toward these averages.
