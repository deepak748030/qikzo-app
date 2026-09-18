import m001 from './001_seed_vehicle_types';
import m002 from './002_seed_app_settings';
import m003 from './003_backfill_booking_geojson';
import m004 from './004_backfill_user_role';
import m005 from './005_init_restaurants_and_category_banners';
import type { MigrationDef } from '../migrator';

/**
 * Ordered migration list. Append only — never re-order, never rename, never
 * delete. Recorded in the `migrations` collection so each name runs exactly
 * once per environment.
 */
export const migrations: MigrationDef[] = [
    m001,
    m002,
    m003,
    m004,
    m005,
];

export default migrations;
