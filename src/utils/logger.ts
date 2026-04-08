/**
 * Lightweight logger utility for development debugging.
 * Only logs when the app is running in development mode.
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function emit(level: LogLevel, tag: string, message: string, data?: unknown) {
  if (!isDev) return;

  const prefix = `[${timestamp()}] [${tag}]`;
  const args = data !== undefined ? [prefix, message, data] : [prefix, message];

  switch (level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

export const logger = {
  debug: (tag: string, message: string, data?: unknown) =>
    emit('debug', tag, message, data),
  info: (tag: string, message: string, data?: unknown) =>
    emit('info', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) =>
    emit('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) =>
    emit('error', tag, message, data),
};
