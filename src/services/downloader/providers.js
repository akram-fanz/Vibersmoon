import { ytdlp } from './ytdlp.js';
import { tiktok } from './tiktok.js';

const providers = [tiktok, ytdlp];

export const providerRouter = {
  match(url) {
    for (const p of providers) if (p.match(url)) return p;
    return null;
  },
  getProvider(name) {
    return providers.find((p) => p.name === name) || null;
  },
  all: providers,
};
