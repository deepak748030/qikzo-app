import pino from 'pino';
import env from '../config/env';

function hasPinoPretty(): boolean {
    try {
        require.resolve('pino-pretty');
        return true;
    } catch {
        return false;
    }
}

export const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: 'qikzo-api' },
    transport: env.isDev && hasPinoPretty()
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
});

export type Logger = typeof logger;
