const fs = require('fs');
const path = require('path');
const figlet = require('figlet');
const chalk = require('chalk');
const boxen = require('boxen');
const config = require('./config');

const OK = () => chalk.green('✅ Aktif');
const OFF = () => chalk.yellow('⚠️  Nonaktif');

function countMusicFiles() {
  try {
    const dir = path.join(__dirname, '..', 'music');
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((f) => /\.(mp3|ogg|m4a|wav)$/i.test(f)).length;
  } catch (e) {
    return 0;
  }
}

function renderLogo() {
  try {
    const art = figlet.textSync('VIBERSMOOON', { font: 'ANSI Shadow' });
    const grad = [chalk.cyan.bold, chalk.blueBright.bold, chalk.magentaBright.bold];
    return art
      .split('\n')
      .map((l, i) => (l.trim() ? grad[i % grad.length](l) : l))
      .join('\n');
  } catch (e) {
    return chalk.cyan.bold('===== BOT SERBA BISA =====');
  }
}

function buildStartupBanner({ botInfo = {}, adminCount = 0, reminderCount = 0 } = {}) {
  const row = (icon, label, value) => `  ${icon} ${chalk.bold(label)}: ${value}`;

  const dlStatus =
    config.YT_DL_API_URL && config.IG_DL_API_URL
      ? OK()
      : config.YT_DL_API_URL || config.IG_DL_API_URL
        ? chalk.yellow('⚠️  Sebagian')
        : OFF();

  const body = [
    row('🤖', 'Bot', chalk.bold('@' + (botInfo.username || 'tidak diketahui'))),
    row('📡', 'Mode', 'Long polling'),
    row('👥', 'Admin', String(adminCount)),
    '',
    row('💬', 'Chat AI', config.AI_ENABLED ? OK() : OFF()),
    row('🧠', 'Vision AI', config.VISION_ENABLED ? OK() : OFF()),
    row('🌤', 'Cuaca', config.WEATHER_ENABLED ? OK() : OFF()),
    row('📥', 'Downloader', dlStatus),
    row('🎵', 'Musik', `${countMusicFiles()} file`),
    row('⏰', 'Reminder', `${reminderCount} dimuat`),
    '',
    chalk.gray(`     ⏱ ${new Date().toLocaleString('id-ID')}  •  Node ${process.version}`),
    chalk.gray('     Tekan Ctrl+C untuk berhenti'),
  ].join('\n');

  const panel = boxen(body, {
    padding: 0,
    margin: { left: 2, right: 2, top: 0, bottom: 0 },
    borderStyle: 'round',
    borderColor: 'cyan',
  });

  return renderLogo() + '\n' + panel;
}

function printStartupBanner(opts) {
  console.log(buildStartupBanner(opts));
}

module.exports = { buildStartupBanner, printStartupBanner };
