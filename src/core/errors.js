export class BotError extends Error {
  constructor(msg, code = 'UNKNOWN') { super(msg); this.code = code; }
}
export class RateLimitError extends BotError {
  constructor() { super('Rate limit exceeded', 'RATE_LIMIT'); }
}
export class QuotaError extends BotError {
  constructor() { super('Download quota exceeded', 'QUOTA'); }
}
