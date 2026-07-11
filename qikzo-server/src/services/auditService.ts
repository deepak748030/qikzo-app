import AuditLog from '../models/AuditLog';
import { logger } from '../lib/logger';

export type AuditInput = {
    actorId?: string | null;
    actorRole?: 'customer' | 'rider' | 'admin' | 'system';
    action: string;
    targetType?: string;
    targetId?: string | null;
    meta?: Record<string, any>;
    ip?: string;
};

/**
 * Record a privileged / security-relevant event. Best-effort: never throws to
 * the caller — audit failures must not break the business path.
 */
export async function audit(evt: AuditInput): Promise<void> {
    try {
        await AuditLog.create({
            actorId: evt.actorId || null,
            actorRole: evt.actorRole || 'system',
            action: evt.action,
            targetType: evt.targetType || '',
            targetId: evt.targetId || null,
            meta: evt.meta || {},
            ip: evt.ip || '',
        });
        logger.info({ audit: evt.action, actor: evt.actorId, target: evt.targetId }, 'audit');
    } catch (err) {
        logger.warn({ err, action: evt.action }, 'audit_write_failed');
    }
}

export const auditService = { audit };
export default auditService;
