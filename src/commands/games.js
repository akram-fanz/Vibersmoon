const GAMES = {
  tictactoe: { name: 'TicTacToe', desc: 'Main X-O lawan bot' },
  trivia: { name: 'Trivia', desc: 'Kuis 3 opsional' },
};

function tictactoeBoard(board) {
  const cells = board.map((c) => (c === null ? '⬜️' : c === 'X' ? '❌' : '⭕️'));
  return cells.join(' | ').replace(/\| \| \| /g, '|\n').replace(/\| \|/g, '|\n');
}

function tictactoeBestMove(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  const opp = 'O', me = 'X';
  for (const [a,b,c] of lines) {
    if (board[a] === me && board[b] === me && board[c] === null) return c;
    if (board[a] === me && board[c] === me && board[b] === null) return b;
    if (board[b] === me && board[c] === me && board[a] === null) return a;
    if (board[a] === opp && board[b] === opp && board[c] === null) return c;
    if (board[a] === opp && board[c] === opp && board[b] === null) return b;
    if (board[b] === opp && board[c] === opp && board[a] === null) return a;
  }
  const corners = [0,2,6,8];
  const empty = corners.filter((i) => board[i] === null);
  if (empty.length) return empty[Math.floor(Math.random() * empty.length)];
  if (board[4] === null) return 4;
  const sides = [1,3,5,7];
  const emptySides = sides.filter((i) => board[i] === null);
  if (emptySides.length) return emptySides[Math.floor(Math.random() * emptySides.length)];
  return null;
}

function checkWin(board, p) {
  const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return L.some(([a,b,c]) => board[a] === p && board[b] === p && board[c] === p);
}

const tictactoeState = new Map();
const triviaState = new Map();

async function startTicTacToe(ctx) {
  const id = ctx.from.id;
  const board = Array(9).fill(null);
  tictactoeState.set(id, { board, turn: 'user', move: 0 });
  await ctx.replyWithHTML(
    '❌⭕️ TicTacToe — Kamu X, Bot O\n\n' + tictactoeBoard(board) + '\n\nGiliran kamu! Balas pesan ini dengan angka 1-9.'
  );
}

async function handleTicTacToeMove(ctx, move) {
  const id = ctx.from.id;
  const s = tictactoeState.get(id);
  if (!s) return;
  if (s.turn !== 'user') return ctx.reply('⚠️ Giliran bot, tunggu.');
  if (move < 1 || move > 9 || s.board[move - 1] !== null) {
    return ctx.reply('⚠️ Posisi tidak valid. Pilih 1-9 yang kosong.');
  }
  s.board[move - 1] = 'X';
  s.move++;
  if (checkWin(s.board, 'X')) {
    tictactoeState.delete(id);
    return ctx.replyWithHTML('🎉 <b>Kamu menang!</b>\n\n' + tictactoeBoard(s.board));
  }
  if (s.move >= 9) { tictactoeState.delete(id); return ctx.replyWithHTML('🤝 <b>Seri!</b>\n\n' + tictactoeBoard(s.board)); }
  // Bot move
  const bm = tictactoeBestMove(s.board);
  if (bm !== null) { s.board[bm] = 'O'; s.move++; }
  if (checkWin(s.board, 'O')) {
    tictactoeState.delete(id);
    return ctx.replyWithHTML('💀 <b>Bot menang!</b>\n\n' + tictactoeBoard(s.board));
  }
  if (s.move >= 9) { tictactoeState.delete(id); return ctx.replyWithHTML('🤝 <b>Seri!</b>\n\n' + tictactoeBoard(s.board)); }
  await ctx.replyWithHTML('Giliran bot...\n\n' + tictactoeBoard(s.board));
}

export function register(bot) {
  bot.command('tictactoe', (ctx) => startTicTacToe(ctx));
  bot.on('message:text', async (ctx, next) => {
    const s = tictactoeState.get(ctx.from.id);
    if (!s) return next();
    const n = Number(ctx.message.text);
    if (!Number.isInteger(n) || n < 1 || n > 9) return next();
    await handleTicTacToeMove(ctx, n);
  });
}
