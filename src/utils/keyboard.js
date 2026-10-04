const MAIN_MENU = [
  ['📥 Download', 'menu_download'],
  ['🔍 Scrape', 'menu_scrape'],
  ['🎮 Game', 'menu_game'],
  ['🛠️ Tools', 'menu_utils'],
  ['💰 Economy', 'menu_economy'],
  ['ℹ️ Info', 'menu_info'],
];
const ADMIN_MENU = [['🛡️ Admin', 'menu_admin']];

export function formatMenu(isAdmin = false) {
  const rows = MAIN_MENU.map(([label, cb]) => `┃ ${label}`);
  if (isAdmin) rows.push('┃ 🛡️ Admin');
  return rows.join('\n');
}

export function mainMenuKeyboard(isAdmin = false) {
  const rows = MAIN_MENU.map(([label]) => [{ text: label, callback_data: label.replace(' ', '_').toLowerCase() }]);
  if (isAdmin) rows.push([{ text: '🛡️ Admin', callback_data: 'menu_admin' }]);
  return rows;
}

export function qualityKeyboard(url) {
  return [
    [{ text: 'MP4 360p', callback_data: `dl:${url}:360` }],
    [{ text: 'MP4 720p', callback_data: `dl:${url}:720` }],
    [{ text: 'MP4 1080p', callback_data: `dl:${url}:1080` }],
    [{ text: 'MP3', callback_data: `dl:${url}:mp3` }],
  ];
}

export function backButton(label = '◀️ Kembali') {
  return [[{ text: label, callback_data: 'menu_main' }]];
}

export function yesNo(callbackPrefix, msg = 'Konfirmasi?') {
  return {
    text: msg,
    keyboard: [
      [{ text: '✅ Ya', callback_data: `${callbackPrefix}:yes` }],
      [{ text: '❌ Tidak', callback_data: `${callbackPrefix}:no` }],
    ],
    reply_markup: { inline_keyboard: [[{ text: '✅ Ya', callback_data: `${callbackPrefix}:yes` }], [{ text: '❌ Tidak', callback_data: `${callbackPrefix}:no` }]] }
  };
}
