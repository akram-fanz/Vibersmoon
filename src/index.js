const chalk = require('chalk');
const config = require('./config');
const { createBot } = require('./bot');
const reminderService = require('./services/reminderService');
const { printStartupBanner } = require('./banner');

async function main() {
  const errors = config.validate();
  if (errors.length) {
    console.error(chalk.red.bold('\n❌ Konfigurasi belum lengkap:'));
    errors.forEach((e) => console.error(chalk.red('   - ' + e)));
    process.exit(1);
  }

  const bot = createBot();

  let me;
  try {
    me = await bot.telegram.getMe();
  } catch (e) {
    console.error(chalk.red.bold(`\n❌ Gagal terhubung ke Telegram: ${e.message}`));
    console.error(chalk.gray('   Periksa BOT_TOKEN di .env atau koneksi internet Anda.'));
    process.exit(1);
  }

  const loaded = reminderService.loadAll(bot);
  printStartupBanner({
    botInfo: me,
    adminCount: config.ADMIN_IDS.length,
    reminderCount: loaded,
  });

  function shutdown(signal) {
    console.log(chalk.gray(`\n${signal} diterima, menutup bot...`));
    bot.stop(signal);
    process.exit(0);
  }
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  await bot.launch();
  console.log(chalk.green.bold('🚀 Bot berjalan! Menunggu pesan masuk...'));
}

main().catch((e) => {
  console.error(chalk.red.bold(`Gagal meluncurkan bot: ${e.message}`));
  process.exit(1);
});
