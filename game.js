export const WIDTH = 10;
export const HEIGHT = 20;
export const SHAPES = {
  I: [[0,1],[1,1],[2,1],[3,1]],
  O: [[1,0],[2,0],[1,1],[2,1]],
  T: [[1,0],[0,1],[1,1],[2,1]],
  J: [[0,0],[0,1],[1,1],[2,1]],
  L: [[2,0],[0,1],[1,1],[2,1]]
};

// One Credit color per shape. J and L are the two mirrored L pieces.
export const PIECE_COLORS = {
  J: '#00b8df', // Cyan
  L: '#eb008b', // Magenta
  O: '#f2e839', // Yellow
  T: '#080808', // Black (key)
  I: '#f6f6f2'  // White
};

export function emptyBoard() {
  return Array.from({length: HEIGHT}, () => Array(WIDTH).fill(null));
}

export function cellsFor(piece) {
  return piece.cells.map(([x,y], i) => ({x:x+piece.x, y:y+piece.y, color:piece.colors[i]}));
}

export function fits(board, piece) {
  return cellsFor(piece).every(({x,y}) => x >= 0 && x < WIDTH && y < HEIGHT && (y < 0 || !board[y][x]));
}

export function moved(piece, dx, dy) {
  return {...piece, x:piece.x+dx, y:piece.y+dy};
}

export function rotated(piece, direction = 1) {
  if (piece.type === 'O') return piece;
  return {...piece, cells:piece.cells.map(([x,y]) => direction === 1 ? [2-y,x] : [y,2-x])};
}

export function tryRotate(board, piece, direction = 1) {
  const next = rotated(piece, direction);
  for (const dx of [0,-1,1,-2,2]) {
    const kicked = moved(next,dx,0);
    if (fits(board,kicked)) return kicked;
  }
  return piece;
}

export function landingPiece(board, piece) {
  let result = piece;
  while (fits(board,moved(result,0,1))) result = moved(result,0,1);
  return result;
}

export function lockPiece(board, piece) {
  const next = board.map(row => row.slice());
  let toppedOut = false;
  for (const cell of cellsFor(piece)) {
    if (cell.y < 0) toppedOut = true;
    else next[cell.y][cell.x] = cell.color;
  }
  const remaining = next.filter(row => row.some(cell => !cell));
  const cleared = HEIGHT - remaining.length;
  return {board:[...Array.from({length:cleared}, () => Array(WIDTH).fill(null)),...remaining], cleared, toppedOut};
}

// Credit artwork is eight cells wide. Center each row in the ten-cell well;
// the two open edge cells remain possible routes for clearing the layer.
export function addCreditLayers(board, sources) {
  const count = sources.length;
  const toppedOut = board.slice(0,count).some(row => row.some(Boolean));
  const layers = sources.map(source => [null,...source.colors,null]);
  return {board:[...board.slice(count).map(row => row.slice()),...layers], toppedOut};
}

export function levelForLines(lines) {
  return 1 + Math.floor(lines / 4);
}

export function gravityMs(level) {
  return Math.max(75, Math.round(900 * Math.pow(0.83, level-1)));
}

export function createBag(random = Math.random) {
  const bag = Object.keys(SHAPES);
  for (let i=bag.length-1; i>0; i--) {
    const j = Math.floor(random() * (i+1));
    [bag[i],bag[j]] = [bag[j],bag[i]];
  }
  return bag;
}
