import test from 'node:test';
import assert from 'node:assert/strict';
import {WIDTH,HEIGHT,SHAPES,PIECE_COLORS,emptyBoard,lockPiece,addCreditLayers,landingPiece,levelForLines,gravityMs,createBag,tryRotate,fits} from './game.js';
import {creditSources} from './credits.js';

test('a placed piece clears complete rows and shifts the stack down', () => {
  const board = emptyBoard();
  board[HEIGHT-1].fill('cyan');
  board[HEIGHT-1][4] = null;
  board[HEIGHT-1][5] = null;
  board[HEIGHT-2][0] = 'magenta';
  const piece = {type:'O',cells:SHAPES.O,colors:Array(4).fill('yellow'),x:3,y:HEIGHT-2};
  const result = lockPiece(board,piece);
  assert.equal(result.cleared,1);
  assert.equal(result.board[HEIGHT-1][0],'magenta');
  assert.equal(result.board[HEIGHT-1][4],'yellow');
  assert.equal(result.board[0].every(cell=>cell===null),true);
});

test('pieces land on the stack and rotation stays inside walls', () => {
  const board = emptyBoard();
  board[HEIGHT-1][4] = 'black';
  const piece = {type:'T',cells:SHAPES.T,colors:Array(4).fill('cyan'),x:3,y:0};
  assert.equal(landingPiece(board,piece).y,HEIGHT-3);
  const atWall = {...piece,x:-1};
  const rotated = tryRotate(board,atWall);
  assert.equal(fits(board,rotated),true);
});

test('level speed rises and first rows match the session log', () => {
  assert.deepEqual(creditSources(1).map(({id,row})=>[id,row]),[[100,4]]);
  assert.deepEqual(creditSources(2).map(({id,row})=>[id,row]),[[200,7]]);
  assert.equal(levelForLines(3),1);
  assert.equal(levelForLines(4),2);
  assert.ok(gravityMs(2)<gravityMs(1));
  assert.equal(new Set(createBag(()=>0)).size,5);
  assert.deepEqual(Object.keys(PIECE_COLORS).sort(),Object.keys(SHAPES).sort());
  assert.equal(WIDTH,10);
});

test('new levels lift the stack and add one credited artwork row', () => {
  const board = emptyBoard();
  board[HEIGHT-2][5] = 'stack';
  const sources = [{colors:Array(8).fill('cyan')}];
  const result = addCreditLayers(board,sources);
  assert.equal(result.toppedOut,false);
  assert.equal(result.board[HEIGHT-1][1],'cyan');
  assert.equal(result.board[HEIGHT-1][8],'cyan');
  assert.equal(result.board[HEIGHT-1][0],null);
  assert.equal(result.board[HEIGHT-1][9],null);
  assert.equal(result.board[HEIGHT-3][5],'stack');
  board[0][0] = 'top';
  assert.equal(addCreditLayers(board,sources).toppedOut,true);
});
