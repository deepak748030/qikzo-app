import AppSettings from '../../models/AppSettings';
import type { MigrationDef } from '../migrator';

/**
 * 002 — Ensure per-audience AppSettings docs exist with sensible defaults +
 * baseline FAQ/legal copy so the mobile hardcoded strings (AUDIT §1.3) can be
 * retired in Phase 4.2.
 */
const migration: MigrationDef = {
    name: '002_seed_app_settings',
    async up() {
        const faqs = [
            { q: 'How do I book a delivery?', a: 'Pick a category, set pickup & drop, confirm the fare and tap Book.' },
            { q: 'How is fare calculated?', a: 'Base fare + per-km rate for the selected vehicle. Surge may apply during peak hours.' },
            { q: 'How do I cancel?', a: 'Open Activity → the booking → Cancel. Free if a rider has not started.' },
        ];
        const legal = {
            privacyPolicy: 'Qikzo respects your privacy. We store phone, name, addresses and trip history to run the service.',
            termsConditions: 'By using Qikzo you agree to fair-use, safe conduct and the fare shown at booking time.',
            aboutUs: 'Qikzo is an on-demand delivery & ride platform built for Tier-1 & Tier-2 Indian cities.',
        };
        await AppSettings.findOneAndUpdate(
            { audience: 'customer' },
            { $setOnInsert: { audience: 'customer', faqs, legal } },
            { upsert: true, setDefaultsOnInsert: true, new: true }
        );
        await AppSettings.findOneAndUpdate(
            { audience: 'rider' },
            { $setOnInsert: { audience: 'rider', faqs, legal, features: { wallet: true, coupons: false, chat: false, liveTracking: true } } },
            { upsert: true, setDefaultsOnInsert: true, new: true }
        );
    },
};

export default migration;
