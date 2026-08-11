// src/utils/logger.ts
//
// pino logger: structured JSON in production (parseable by any log platform),
// human-readable console output in development. Call shape is pino's own -
// `logger.info(mergeObj?, msg?)` - so call sites never change between modes.
//
// No pino transports (pino-pretty workers don't survive Next's bundling);
// the dev formatter is a tiny inline replacement.
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

type LogArg = unknown;

const devEmit =
  (level: 'debug' | 'info' | 'warn' | 'error' | 'fatal') =>
  (a?: LogArg, b?: string): void => {
    const time = new Date().toISOString();
    const fn =
      level === 'fatal'
        ? console.error
        : level === 'debug'
          ? console.debug
          : console[level];

    if (typeof a === 'string') {
      fn(`[${level}] ${time} - ${a}`);
    } else {
      fn(`[${level}] ${time} - ${b ?? ''}`, a ?? '');
    }
  };

const devLogger = {
  debug: devEmit('debug'),
  info: devEmit('info'),
  warn: devEmit('warn'),
  error: devEmit('error'),
  fatal: devEmit('fatal'),
};

const prodLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { app: 'aesthetics-suites' },
  // Never log secrets even if a call site passes a whole object through.
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
    ],
    censor: '[REDACTED]',
  },
});

const logger = isProduction ? prodLogger : devLogger;

export default logger;
