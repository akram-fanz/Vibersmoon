import 'dotenv/config';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { start } from './bot.js';

async function main() {
  if (!config.botToken) {
    console.error('FATAL: BOT_TOKEN tidak diset. Bot berhenti.');
    process.exit(1);
  }
  console.log('===== VIBERSMOON =====');
  console.log(`Admin: ${config.adminIds.length} | Node ${process.version}`);
  await start();
}

main().catch((e) => {
  console.error(`Gagal meluncurkan bot: ${e.message}`);
  process.exit(1);
});
