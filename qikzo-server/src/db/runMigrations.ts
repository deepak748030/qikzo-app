import 'dotenv/config';
import { connectDB, mongoose } from '../config/db';
import { runMigrations, syncIndexes } from './migrator';
import { migrations } from './migrations';
import { logger } from '../lib/logger';

async function main(): Promise<void> {
    await connectDB();
    logger.info('migrate: syncing indexes');
    await syncIndexes();
    logger.info('migrate: running migrations');
    const { applied, skipped } = await runMigrations(migrations);
    logger.info({ applied, skipped }, 'migrate: done');
    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    logger.error({ err }, 'migrate: failed');
    process.exit(1);
});
