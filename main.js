import {WIDTH,HEIGHT,SHAPES,PIECE_COLORS,emptyBoard,fits,moved,tryRotate,landingPiece,lockPiece,addCreditLayers,levelForLines,gravityMs,createBag,cellsFor} from './game.js';
import {loadLevelSources} from './credits.js';

const $ = id => document.getElementById(id);
const boardCanvas = $('board');
const ctx = boardCanvas.getContext('2d');
const nextCtx = $('next').getContext('2d');
const TILE = boardCanvas.width / WIDTH;
let board = emptyBoard(), active = null, next = null, bag = [];
let sources = null, lineCount = 0, score = 0, level = 1;
let mode = 'loading', timer = null, queuedSources = null, logEntries = 0;
let piecesPlaced = 0, clearingPieces = 0, totalDropMs = 0, pieceSpawnMs = 0;
let activePlayMs = 0, playStartedAt = null;
let clearTimeMs = 0, lastClearMs = 0;

function playTimeMs() {
  return activePlayMs + (playStartedAt === null ? 0 : performance.now() - playStartedAt);
}
function startPlayClock() { if (playStartedAt === null) playStartedAt = performance.now(); }
function stopPlayClock() {
  if (playStartedAt !== null) { activePlayMs += performance.now() - playStartedAt; playStartedAt = null; }
}
function seconds(ms) { return `${(ms / 1000).toFixed(1)}s`; }

function showGameSummary() {
  const summary = $('game-summary');
  const rows = [
    ['Final level', String(level).padStart(2,'0')],
    ['Avg time to clear a line', lineCount ? seconds(clearTimeMs / lineCount) : '—'],
    ['Odds to clear a line per piece', piecesPlaced ? `${Math.round(clearingPieces / piecesPlaced * 100)}% (${clearingPieces}/${piecesPlaced})` : '—'],
    ['Avg time to drop', piecesPlaced ? seconds(totalDropMs / piecesPlaced) : '—']
  ];
  const table = document.createElement('table');
  table.setAttribute('aria-label','Game statistics');
  const body = document.createElement('tbody');
  for (const [label,value] of rows) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row'; th.textContent = label;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th,td); body.append(tr);
  }
  table.append(body); summary.replaceChildren(table); summary.hidden = false;
}

function log(title, detail = '') {
  const list = $('game-log');
  if (!logEntries) list.replaceChildren();
  logEntries++;
  const li = document.createElement('li');
  const label = document.createElement('span');
  label.className = 'log-number';
  label.textContent = String(logEntries).padStart(2,'0') + ' /';
  const strong = document.createElement('strong');
  strong.textContent = title;
  li.append(label, strong);
  if (detail) {
    const small = document.createElement('span');
    small.className = 'log-detail';
    small.textContent = detail;
    li.append(small);
  }
  list.prepend(li);
}

function showOverlay(kicker,title,copy,button,onClick,disabled=false) {
  $('overlay').classList.remove('hidden');
  $('game-summary').hidden = true;
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').innerHTML = title;
  $('overlay-copy').textContent = copy;
  $('start').textContent = button;
  $('start').disabled = disabled;
  $('start').onclick = onClick;
}

function updateStats() {
  $('level').textContent = String(level).padStart(2,'0');
  $('score').textContent = String(score).padStart(6,'0');
  $('lines').textContent = String(lineCount).padStart(2,'0');
  $('pieces').textContent = String(piecesPlaced).padStart(2,'0');
  $('speed').textContent = gravityMs(level) + ' ms / fall';
  const progress = lineCount % 4;
  $('progress-count').textContent = `${progress} / 4 lines`;
  $('progress-fill').style.width = `${progress*25}%`;
  $('board-status').textContent = mode === 'playing' ? 'IN PLAY' : mode === 'paused' ? 'PAUSED' : mode === 'over' ? 'GAME OVER' : 'READY TO PLAY';
}

function showSources() {
  const container = $('sources');
  container.replaceChildren();
  if (!sources) {container.textContent = 'Loading Credit rows…'; return;}
  for (const source of sources) {
    const card = document.createElement('div');
    card.className = 'source-card';
    const heading = document.createElement('div');
    heading.className = 'source-id';
    heading.innerHTML = `<span>Credit #${source.id}</span><span>ROW ${source.row}</span>`;
    const colors = document.createElement('div');
    colors.className = 'swatches';
    source.colors.forEach(color => {const swatch = document.createElement('i'); swatch.style.background = color; colors.append(swatch);});
    card.append(heading,colors);
    container.append(card);
  }
}

function drawTile(target,x,y,color,size,ghost=false) {
  target.fillStyle = ghost ? 'rgba(232,236,219,.15)' : color;
  target.fillRect(x*size+1,y*size+1,size-2,size-2);
  if (ghost) { target.strokeStyle='rgba(232,236,219,.38)'; target.strokeRect(x*size+1.5,y*size+1.5,size-3,size-3); }
  else {
    target.strokeStyle = 'rgba(255,255,255,.3)';
    target.strokeRect(x*size+1.5,y*size+1.5,size-3,size-3);
    target.fillStyle='rgba(255,255,255,.22)';
    target.fillRect(x*size+2,y*size+2,size-4,3);
  }
}

function render() {
  ctx.fillStyle = '#151813';
  ctx.fillRect(0,0,boardCanvas.width,boardCanvas.height);
  ctx.strokeStyle = '#2b3028';
  ctx.lineWidth = 1;
  for (let x=1; x<WIDTH; x++) {ctx.beginPath();ctx.moveTo(x*TILE+.5,0);ctx.lineTo(x*TILE+.5,HEIGHT*TILE);ctx.stroke();}
  for (let y=1; y<HEIGHT; y++) {ctx.beginPath();ctx.moveTo(0,y*TILE+.5);ctx.lineTo(WIDTH*TILE,y*TILE+.5);ctx.stroke();}
  board.forEach((row,y) => row.forEach((color,x) => {if(color) drawTile(ctx,x,y,color,TILE);}));
  if (active) {
    const landing = landingPiece(board,active);
    cellsFor(landing).forEach(cell => {if(cell.y>=0) drawTile(ctx,cell.x,cell.y,cell.color,TILE,true);});
    cellsFor(active).forEach(cell => {if(cell.y>=0) drawTile(ctx,cell.x,cell.y,cell.color,TILE);});
  }
  nextCtx.clearRect(0,0,128,128);
  if (next) {
    const cells = next.cells;
    const minX = Math.min(...cells.map(cell=>cell[0]));
    const maxX = Math.max(...cells.map(cell=>cell[0]));
    const minY = Math.min(...cells.map(cell=>cell[1]));
    const maxY = Math.max(...cells.map(cell=>cell[1]));
    const size = 25;
    const ox = (128-(maxX-minX+1)*size)/2;
    const oy = (128-(maxY-minY+1)*size)/2;
    cells.forEach(([x,y],i) => {
      nextCtx.fillStyle = next.colors[i];
      nextCtx.fillRect(ox+(x-minX)*size+1,oy+(y-minY)*size+1,size-2,size-2);
      nextCtx.strokeStyle = 'rgba(255,255,255,.65)';
      nextCtx.strokeRect(ox+(x-minX)*size+1.5,oy+(y-minY)*size+1.5,size-3,size-3);
    });
  }
}

function nextType() {
  if (!bag.length) bag = createBag();
  return bag.pop();
}

function coloredPiece() {
  const type = nextType();
  const colors = Array(4).fill(PIECE_COLORS[type]);
  return {type,cells:SHAPES[type].map(cell=>cell.slice()),colors,x:3,y:-1};
}

function spawn() {
  active = next || coloredPiece();
  next = coloredPiece();
  pieceSpawnMs = playTimeMs();
  if (!fits(board,active)) gameOver();
  render();
}

function clearTimer() {if(timer) clearTimeout(timer);timer=null;}
function tick() {
  if (mode !== 'playing' || !active) return;
  const below = moved(active,0,1);
  if (fits(board,below)) active = below;
  else place();
  render();
  if (mode === 'playing') scheduleTick();
}
function scheduleTick() {clearTimer();timer=setTimeout(tick,gravityMs(level));}

function place() {
  if (!active) return;
  const dropMs = Math.max(0, playTimeMs() - pieceSpawnMs);
  const result = lockPiece(board,active);
  board = result.board;
  active = null;
  piecesPlaced++;
  totalDropMs += dropMs;
  if (result.cleared) clearingPieces++;
  if (result.cleared) {
    const clearedAtMs = playTimeMs();
    clearTimeMs += clearedAtMs - lastClearMs;
    lastClearMs = clearedAtMs;
    lineCount += result.cleared;
    score += [0,100,300,500,800][result.cleared] * level;
    log(`${result.cleared} ${result.cleared===1?'row':'rows'} cleared`, `Score +${[0,100,300,500,800][result.cleared]*level}`);
  }
  if (result.toppedOut) {gameOver();return;}
  const newLevel = levelForLines(lineCount);
  if (newLevel > level) { advanceLevel(newLevel); return; }
  spawn();
  updateStats();
}

async function advanceLevel(newLevel) {
  clearTimer();
  stopPlayClock();
  mode = 'loading';
  showOverlay('LEVEL COMPLETE',`Level ${String(newLevel).padStart(2,'0')}`, 'Loading the next Credit rows…','Loading…',null,true);
  updateStats();
  try {
    const rows = await (queuedSources || loadLevelSources(newLevel));
    level = newLevel;
    sources = rows;
    const raised = addCreditLayers(board,rows);
    board = raised.board;
    queuedSources = loadLevelSources(newLevel+1);
    queuedSources.catch(()=>{});
    showSources();
    log(`Level ${String(level).padStart(2,'0')} · row added`, rows.map(s=>`Credit #${s.id} row ${s.row}`).join(' · '));
    if (raised.toppedOut) {gameOver();render();return;}
    mode = 'playing';
    $('overlay').classList.add('hidden');
    startPlayClock();
    spawn();
    updateStats();
    scheduleTick();
  } catch (error) {
    queuedSources = null;
    showOverlay('CONNECTION LOST','Credits unavailable',error.message,'Retry level',()=>advanceLevel(newLevel));
  }
}

function gameOver() {
  clearTimer();
  stopPlayClock();
  active = null;
  mode = 'over';
  log('Game over', `${lineCount} lines · ${score} points`);
  showOverlay('GAME OVER','You have exceeded your credit limit.',`${lineCount} lines cleared · ${score} points`,'Play again',startGame);
  showGameSummary();
  updateStats();
}

function startGame() {
  clearTimer();
  board = emptyBoard();
  active = null; next = null; bag = [];
  lineCount = 0; score = 0; level = 1;
  piecesPlaced = 0; clearingPieces = 0; totalDropMs = 0; pieceSpawnMs = 0;
  activePlayMs = 0; playStartedAt = null;
  clearTimeMs = 0; lastClearMs = 0;
  mode = 'playing';
  board = addCreditLayers(board,sources).board;
  log('Game started');
  log('Level 01 · row added',sources.map(s=>`Credit #${s.id} row ${s.row}`).join(' · '));
  queuedSources = loadLevelSources(2);
  queuedSources.catch(()=>{});
  $('overlay').classList.add('hidden');
  startPlayClock();
  spawn();
  updateStats();
  scheduleTick();
}

function pause() {
  if (mode === 'playing') {
    mode = 'paused';clearTimer();
    stopPlayClock();
    showOverlay('BREAK TIME','Paused.', 'Take a breath. Your stack is right where you left it.','Resume',pause);
  } else if (mode === 'paused') {mode='playing';$('overlay').classList.add('hidden');startPlayClock();scheduleTick();}
  updateStats();
}

function action(name) {
  if (name === 'pause') {pause();return;}
  if (mode !== 'playing' || !active) return;
  if (name === 'left' || name === 'right') {
    const candidate = moved(active,name==='left'?-1:1,0);
    if (fits(board,candidate)) active=candidate;
  } else if (name === 'rotate') active=tryRotate(board,active,1);
  else if (name === 'reverse') active=tryRotate(board,active,-1);
  else if (name === 'drop') {active=landingPiece(board,active);place();if(mode==='playing') scheduleTick();}
  render();
}

document.addEventListener('keydown', event => {
  const key = event.code;
  const commands = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',KeyX:'rotate',KeyZ:'reverse',ArrowDown:'drop',Space:'drop',KeyP:'pause'};
  if (!commands[key]) return;
  event.preventDefault();
  if (event.repeat && (key==='Space'||key==='ArrowDown'||key==='KeyP')) return;
  action(commands[key]);
});
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click',()=>action(button.dataset.action)));

async function initialLoad() {
  try {
    sources = await loadLevelSources(1);
    showSources();
    mode = 'ready';
    updateStats();
    showOverlay('CREDIT-POWERED TETRIS','are you ready?','Every level adds a row of credit to clear','start',startGame);
  } catch (error) {
    mode = 'error';
    showOverlay('CONNECTION LOST','Credits unavailable',error.message,'Retry loading',initialLoad);
  }
}
updateStats();render();initialLoad();
